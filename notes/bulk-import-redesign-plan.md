# Bulk resume import — redesign plan (2026-10-24)

Plan only. No code has been changed for this.

## 1. What happens today

**User flow**
1. Resume Imports → New Import → pick optional source job → choose up to 5 PDF/DOC/DOCX files → Start Import.
2. Server stores the files and redirects to the batch page. Parsing starts in a `next/server` `after()` callback.
3. Batch page is static: the user clicks Refresh to see progress. "Continue Processing" runs the parser inside the request and blocks until done.
4. Per resume: Review (opens the full 60-field candidate form pre-filled) → Create Candidate → lands on the candidate page → navigate back to the batch → next item.
5. Duplicates are only discovered when Create Candidate is clicked (409 redirect back to the form).

**Pipeline per resume** (`src/lib/candidates/resume-parser.ts`, `resume-imports.ts`)
- Text extraction: `pdfjs-dist` for PDF, `mammoth` for DOCX. DOC returns empty text. No OCR, so scanned PDFs parse to nothing.
- Heuristic pass: regex and keyword lists for name, email, phone, role, skills, location, experience.
- LLM pass: one `ollama.chat` call to Ollama Cloud (default `qwen3.5:cloud`, `num_ctx` 32k, temperature 0). Prompt is about 21k characters: 15 rules, the full 62-field JSON schema pasted as text, plus up to 16k characters of resume. The schema is sent twice (as text and as `format`). No timeout, no retry, no output cap. Failure silently falls back to heuristic data.
- Stored on the item: parsed JSON, a 1200-character text preview, warnings.

**Why it is slow**
- Items are processed strictly one after another. Five resumes equal five sequential cloud LLM calls, each tens of seconds with a 6k-token prompt.
- Batch stats are recomputed twice per item (a find over all items plus an update each time).
- Nothing updates the screen; the user polls by hand.
- No `maxDuration` on the routes, so Vercel can kill a run mid-batch; items then sit in `processing` for 10 minutes before they can be retried.
- Review is a full form per candidate, so the human step costs 3 to 4 navigations per resume even when the parse was perfect.

## 2. Target experience

"Drop 20 to 50 resumes, watch rows fill in live, fix only the rows that are flagged, click Create Selected, stay on the batch."

Principles
- Parsing is not the bottleneck the user should feel. Show heuristic results within a second; let the LLM enrich rows in the background.
- Review is a table, not a form. One row per resume with the 6 to 8 fields that matter for intake; inline edit; the full form only for exceptions.
- Flag, don't block. Duplicates, missing contact, empty text and low confidence are badges on the row with a one-click action.
- The batch page is live and never blocks a request.

## 3. Phased plan

### Phase 0 — measure (half a day)
- Add per-step timing (download, extract, heuristics, LLM, DB) to the processor logs and to a `timings` JSON on each item.
- Run a 5-resume batch in prod and read the numbers. Decide model and concurrency from data, not guesses.

### Phase 1 — make the current flow fast and reliable (1 to 2 days, no UI redesign)
- Process items concurrently (3 to 5 at a time) with an atomic claim: `update where id = X and status = 'queued'` and only parse if a row was affected. This also removes the double-processing bug.
- Add `export const maxDuration` to the process and create routes, `AbortSignal.timeout(45s)` and two retries with backoff on the LLM call, and `num_predict` to cap output.
- Compute batch stats once at the end of a run with `payload.count` per status instead of twice per item.
- Shrink the prompt: stop pasting the schema into the text (the `format` already enforces it), reduce the import schema to about 20 intake fields (name parts, email, phone, location, current role and company, total experience, notice period, expected pay, skills, LinkedIn, summary), and lower `num_ctx` to 16k. Expect a 2 to 3× speedup per call.
- Early duplicate check during parsing: look up `normalizedEmail` and `normalizedPhone`, store `duplicateOf` on the item and show "Possible duplicate of CAN-xxx" with an "Attach resume to existing candidate" action.
- Fix the retry path so it works without S3 (read the file through Payload instead of an unauthenticated HTTP fetch to ourselves).
- Live progress: a small JSON status endpoint polled every 3 seconds by the batch page (or Server-Sent Events). Rows update in place; no Refresh button needed.
- Raise the file limit to 20 to 50. Because Vercel caps a request body at about 4.5 MB, upload files one at a time from the browser (sequential `fetch` per file to an "add file to batch" endpoint) or upload directly to R2 with presigned URLs and register the keys. Show a per-file progress list during upload.

### Phase 2 — the review-table UX (3 to 5 days)
- Replace the batch page item list with a review grid: Name, Email, Phone, Current Role, Experience, Top Skills, Source Job, Status/flags. Inline-editable cells for those fields; checkbox per row.
- Badges: Ready, Needs attention (missing name or contact), Possible duplicate, No text extracted, LLM fallback only.
- Bulk actions: Create Selected, Create All Ready, Skip Selected. Creation runs row by row on the server, each in its own transaction, and reports per-row results back into the grid without leaving the page.
- "Open full review" per row keeps today's form for edge cases; after saving it returns to the batch, not the candidate page.
- Optional at upload time: "Auto-create rows that are ready" so clean resumes never need a human click. Keep it off by default for the first few weeks.
- Keyboard flow: arrow down, Enter to edit, Cmd/Ctrl+Enter to create.

### Phase 3 — infrastructure (2 to 4 days, can run in parallel with Phase 2)
- Move processing to the Payload Jobs queue: one job per resume, queued at upload, run by a Vercel Cron hitting the jobs endpoint every minute (plus an immediate kick-off from the create route). Survives function timeouts, gives retries and backoff for free, and makes concurrency a config value.
- Store the full extracted text on the resume document so re-parsing and re-running the LLM never re-download or re-extract the file.
- SHA-256 the uploaded file and flag identical uploads across batches.
- DOC support with `word-extractor` (pure JS, works on Vercel) or stop advertising DOC.
- Scanned PDFs: detect "no text layer" and either send page images to a vision-capable model or mark the row "Needs manual entry" immediately instead of parsing nothing.

## 4. Parsing engine options

Measured against the Phase 0 numbers, in rough order of preference:

1. **Keep Ollama Cloud but fix the call** (Phase 1 prompt and schema changes, concurrency, timeout). Cheapest change. Risk: cloud latency and rate limits on the free tier are outside our control, and the key is a single point of failure that today fails silently.
2. **Hosted LLM with structured output** (for example Claude Haiku through the Claude API, or an equivalent) behind the same `extractStructuredResumeDataWithLLM` function. Typically far lower latency and reliable JSON. Decide after measuring; do not assume prices or limits without checking the provider's current docs.
3. **Dedicated resume-parsing API** (Affinda, Textkernel, RChilli). Best accuracy on messy layouts, handles DOC and scanned PDFs with OCR built in, paid per parse. Worth it if volume grows into thousands per month; overkill today.
4. **Heuristics first, LLM later**: regardless of engine, show the heuristic row immediately and let the LLM enrichment patch the row when it arrives. This alone changes the perceived speed from "minutes" to "instant".

## 5. Suggested order

Phase 0 → Phase 1 (ship, users feel it immediately) → Phase 2 review table → Phase 3 queue and file hashing. Decide on the engine after Phase 0 numbers are in.

## 6. Out of scope for now
- Candidate-portal self-upload (invite flow is currently dead code; see the audit notes).
- Automatic application stage changes beyond the existing `sourced` creation.
