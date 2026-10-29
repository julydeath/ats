import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { AutoRefresh } from '@/components/internal/AutoRefresh'
import { BulkResumeUploader } from '@/components/internal/BulkResumeUploader'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import {
  MAX_RESUME_IMPORT_FILES,
  MAX_RESUME_IMPORT_FILE_SIZE_BYTES,
  RESUME_IMPORT_STALE_MS,
} from '@/lib/candidates/resume-imports'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'
import type { CandidateResumeImportItem } from '@/payload-types'

const TRAY_WINDOW_DAYS = 14

const readFilename = (resume: CandidateResumeImportItem['resume']): string =>
  typeof resume === 'object' && resume ? resume.filename || resume.alt || 'Resume' : 'Resume'

const readRole = (batch: CandidateResumeImportItem['batch']): string =>
  typeof batch === 'object' && batch?.role ? `${batch.role} · ` : ''

const readCandidateName = (candidate: CandidateResumeImportItem['candidate']): string =>
  typeof candidate === 'object' && candidate ? candidate.fullName : ''

const readWarnings = (item: CandidateResumeImportItem): string[] =>
  (item.warnings || [])
    .map((warning) => warning.message)
    .filter((message) => /later\.$/.test(message))

const formatWhen = (value: string): string =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )

export default async function CandidateImportNewPage() {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const since = new Date(Date.now() - TRAY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const staleBefore = Date.now() - RESUME_IMPORT_STALE_MS
  const returnTo = APP_ROUTES.internal.candidates.importsNew

  const [itemsResult, jobsResult] = await Promise.all([
    payload.find({
      collection: 'candidate-resume-import-items',
      depth: 1,
      limit: 150,
      overrideAccess: false,
      pagination: false,
      sort: '-createdAt',
      user,
      where: {
        and: [{ uploadedBy: { equals: user.id } }, { createdAt: { greater_than_equal: since } }],
      },
    }),
    payload.find({
      collection: 'jobs',
      depth: 0,
      limit: 300,
      overrideAccess: false,
      pagination: false,
      select: {
        title: true,
      },
      sort: '-updatedAt',
      user,
    }),
  ])

  const roleSuggestions = Array.from(
    new Set(
      jobsResult.docs
        .map((job) => job.title?.trim())
        .filter((title): title is string => Boolean(title)),
    ),
  ).slice(0, 100)

  const items = itemsResult.docs as CandidateResumeImportItem[]
  const isStale = (item: CandidateResumeImportItem) =>
    item.status === 'processing' &&
    new Date(item.startedAt || item.updatedAt).getTime() < staleBefore

  const pending = items.filter(
    (item) => (item.status === 'queued' || item.status === 'processing') && !isStale(item),
  )
  const attention = items.filter(
    (item) =>
      !item.dismissedAt &&
      (item.status === 'failed' || item.status === 'needsReview' || isStale(item)),
  )
  const done = items
    .filter((item) => item.status === 'candidateCreated' || item.status === 'duplicate')
    .slice(0, 30)
  const createdCount = items.filter((item) => item.status === 'candidateCreated').length

  return (
    <section className="candidate-import-page">
      <AutoRefresh active={pending.length > 0} />

      <header className="candidate-import-header">
        <div>
          <p className="candidate-import-kicker">Candidates</p>
          <h1>Bulk Resume Upload</h1>
          <p>
            Pick the platform, drop up to {MAX_RESUME_IMPORT_FILES} resumes, and upload. We read the
            name, contact, skills, and experience and add each candidate automatically. You only
            need to act on resumes that fail.
          </p>
        </div>

        <div className="candidate-import-header-actions">
          <Link className="candidate-intake-head-btn" href={APP_ROUTES.internal.candidates.list}>
            Candidate Bank
          </Link>
          <Link className="candidate-intake-head-btn" href={APP_ROUTES.internal.candidates.new}>
            Single Candidate
          </Link>
        </div>
      </header>

      <BulkResumeUploader
        createURL={APP_ROUTES.internal.candidates.importsCreate}
        filesBaseURL={APP_ROUTES.internal.candidates.imports}
        maxFileSizeBytes={MAX_RESUME_IMPORT_FILE_SIZE_BYTES}
        maxFiles={MAX_RESUME_IMPORT_FILES}
        roleSuggestions={roleSuggestions}
      />

      <section className="candidate-import-list-card" id="my-uploads">
        <header className="candidate-import-section-head">
          <h2>My Uploads</h2>
          <p>
            Last {TRAY_WINDOW_DAYS} days · {createdCount} candidate{createdCount === 1 ? '' : 's'}{' '}
            added
            {pending.length > 0 ? ` · ${pending.length} still processing` : ''}
          </p>
        </header>

        {pending.length > 0 ? (
          <p className="candidate-import-warning candidate-bulk-processing">
            Reading {pending.length} resume{pending.length === 1 ? '' : 's'}… this page updates on
            its own.
          </p>
        ) : null}

        {attention.length > 0 ? (
          <div className="candidate-import-item-list" id="needs-attention">
            <h3 className="candidate-bulk-group-title">Needs attention ({attention.length})</h3>
            {attention.map((item) => {
              const legacyReview = item.status === 'needsReview'
              const batchID = extractRelationshipID(item.batch)

              return (
                <article className="candidate-import-item" key={`tray-attention-${item.id}`}>
                  <div className="candidate-import-item-main">
                    <span className="candidate-import-status candidate-import-status-failed">
                      {legacyReview ? 'Needs review' : 'Failed'}
                    </span>
                    <h3>{readFilename(item.resume)}</h3>
                    <p>
                      {readRole(item.batch)}Uploaded {formatWhen(item.createdAt)}
                    </p>
                    <p className="candidate-import-error">
                      {legacyReview
                        ? 'Uploaded with the old review flow. Open it to finish creating the candidate.'
                        : isStale(item)
                          ? 'Reading this resume timed out. Retry it.'
                          : item.error || 'This resume could not be read.'}
                    </p>
                  </div>

                  <div className="candidate-import-item-actions">
                    {legacyReview ? (
                      <Link
                        className="candidate-mgmt-action-link"
                        href={`${APP_ROUTES.internal.candidates.imports}/${batchID}/items/${item.id}/review`}
                      >
                        Review
                      </Link>
                    ) : (
                      <form
                        action={`${APP_ROUTES.internal.candidates.imports}/items/${item.id}`}
                        method="post"
                      >
                        <input name="action" type="hidden" value="retry" />
                        <input name="returnTo" type="hidden" value={returnTo} />
                        <button
                          className="candidate-mgmt-action-link"
                          data-pending-label="Retrying..."
                          type="submit"
                        >
                          Retry
                        </button>
                      </form>
                    )}
                    <Link
                      className="candidate-mgmt-action-link candidate-mgmt-action-link-secondary"
                      href={APP_ROUTES.internal.candidates.new}
                    >
                      Add manually
                    </Link>
                    <form
                      action={`${APP_ROUTES.internal.candidates.imports}/items/${item.id}`}
                      method="post"
                    >
                      <input name="action" type="hidden" value="dismiss" />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <button
                        className="candidate-mgmt-action-link candidate-mgmt-action-link-secondary"
                        type="submit"
                      >
                        Dismiss
                      </button>
                    </form>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}

        {done.length > 0 ? (
          <div className="candidate-import-item-list">
            <h3 className="candidate-bulk-group-title">Added</h3>
            {done.map((item) => {
              const candidateID = extractRelationshipID(item.candidate)
              const isDuplicate = item.status === 'duplicate'
              const warnings = readWarnings(item)

              return (
                <article className="candidate-import-item" key={`tray-done-${item.id}`}>
                  <div className="candidate-import-item-main">
                    <span
                      className={`candidate-import-status candidate-import-status-${isDuplicate ? 'duplicate' : 'candidateCreated'}`}
                    >
                      {isDuplicate ? 'Already in bank' : 'Added'}
                    </span>
                    <h3>{readCandidateName(item.candidate) || readFilename(item.resume)}</h3>
                    <p>
                      {readRole(item.batch)}
                      {readFilename(item.resume)} · {formatWhen(item.createdAt)}
                    </p>
                    {warnings.length > 0 ? (
                      <p className="candidate-import-warning">{warnings.join(' ')}</p>
                    ) : null}
                  </div>

                  {candidateID ? (
                    <div className="candidate-import-item-actions">
                      <Link
                        className="candidate-mgmt-action-link candidate-mgmt-action-link-secondary"
                        href={`${APP_ROUTES.internal.candidates.detailBase}/${candidateID}`}
                      >
                        Open
                      </Link>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : null}

        {items.length === 0 ? (
          <p className="candidate-import-empty">
            Nothing uploaded in the last {TRAY_WINDOW_DAYS} days.
          </p>
        ) : null}
      </section>
    </section>
  )
}
