# Recruitment Operations Platform (ATS)

Production-oriented Recruitment Operations Platform for **Realizing Dreams Inspirix HR Services**.

Implemented through Phase 6:

- Internal operations portal (role-based)
- Client/job intake and assignment hierarchy
- Candidate sourcing and internal review workflow
- External candidate invite + application portal

## Stack

- Next.js (App Router + TypeScript)
- Payload CMS
- PostgreSQL
- Resend email API

## Roles

Internal:

- `admin`
- `leadRecruiter`
- `recruiter`

External:

- `candidate`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Set required values in `.env`.

4. Generate Payload artifacts:

```bash
npm run generate:types
npm run generate:importmap
```

5. Start dev server:

```bash
npm run dev
```

6. Open:

- App: `http://localhost:3000`
- Internal Login: `http://localhost:3000/internal/login`
- Candidate Login: `http://localhost:3000/candidate/login`
- Payload Admin: `http://localhost:3000/admin`

## Environment Variables

Required:

- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `NEXT_PUBLIC_APP_URL`

Candidate invite + email:

- `CANDIDATE_INVITE_TOKEN_TTL_HOURS` (default `72`)
- `RESEND_API_KEY` (replace `re_xxxxxxxxx` with your real API key)
- `RESEND_FROM_EMAIL`
- `RESEND_TEST_TO_EMAIL`

Optional SMTP and storage placeholders are already in `.env.example`.

## Phase 6 Highlights

1. Secure invite model:
   - `candidate-invites` collection with hashed token, expiry, single-use status lifecycle.
2. Candidate auth model:
   - `candidate-users` auth collection (separate from internal `users`).
3. Invite workflow:
   - Lead approval (`internalReviewApproved`) triggers invite creation + email.
   - Application auto-transitions to `candidateInvited`.
4. Candidate application flow:
   - `/candidate/invite/[token]` form updates candidate profile, provisions candidate account, marks invite consumed.
   - Application transitions to `candidateApplied` with history entry.
5. Candidate portal:
   - `/candidate/dashboard`
   - `/candidate/applications`
6. Access control:
   - Candidate can read/update only own profile.
   - Candidate can read only own applications/history via candidate profile mapping.

## Resend Setup

Use `.env` values:

- `RESEND_API_KEY=re_xxxxxxxxx`
- `RESEND_FROM_EMAIL=onboarding@resend.dev`

Replace `re_xxxxxxxxx` with your real Resend API key.
