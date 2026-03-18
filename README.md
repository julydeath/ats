# Recruitment Operations Platform (ATS)

Production-oriented Recruitment Operations Platform for **Realizing Dreams Inspirix HR Services**.

This repository uses:
- Next.js (App Router + TypeScript)
- Payload CMS
- PostgreSQL

Phase 1 establishes:
- Internal user auth foundation
- Internal role model and access helpers
- Protected internal routing strategy
- Base internal login and dashboard shell
- External candidate auth architecture plan (not full candidate portal yet)

## Internal Roles

- `admin`
- `headRecruiter`
- `leadRecruiter`
- `recruiter`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Update `.env` with your PostgreSQL credentials and secret.

4. Generate Payload artifacts:

```bash
npm run generate:types
npm run generate:importmap
```

5. Start development server:

```bash
npm run dev
```

6. Open:
- App: `http://localhost:3000`
- Internal Login: `http://localhost:3000/internal/login`
- Payload Admin: `http://localhost:3000/admin`

## Environment Variables

Required for Phase 1:
- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `NEXT_PUBLIC_APP_URL`

Prepared for upcoming phases:
- SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`)
- Invite TTL (`CANDIDATE_INVITE_TOKEN_TTL_HOURS`)
- Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_TEST_TO_EMAIL`)
- Object storage (`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`)

## Phase 1 Structure

```text
src/
  access/
    internalRoles.ts
  app/
    (frontend)/
      internal/
        (auth)/login/page.tsx
        (protected)/layout.tsx
        (protected)/dashboard/page.tsx
      layout.tsx
      page.tsx
      styles.css
    (payload)/...
  collections/
    Users.ts
    Media.ts
  components/
    internal/
      InternalLoginForm.tsx
      InternalNavigation.tsx
  lib/
    auth/
      internal-auth.ts
      candidate-auth-plan.ts
    constants/
      roles.ts
      routes.ts
      internal-navigation.ts
    utils/
      safe-redirect.ts
    env.ts
  middleware.ts
  payload.config.ts
```

## Auth Strategy (Phase 1)

- Middleware (`src/middleware.ts`) performs a fast cookie presence check on `/internal/*` routes.
- Server-side protected layout (`/internal/(protected)/layout.tsx`) performs authoritative auth validation via Payload.
- Internal login uses Payload auth endpoint (`/api/users/login`) and rejects non-internal roles.

## Candidate Auth Preparation (Phase 1 only)

Candidate-side auth is intentionally not implemented yet. Planning constants are in:
- `src/lib/auth/candidate-auth-plan.ts`

This preserves domain rules:
- candidates remain external identities
- applications are the candidate-job mapping source of truth
- stage progression will live on applications, not candidate master

## Resend Setup (Before Phase 2)

1. Set the following in your `.env`:
   - `RESEND_API_KEY=re_xxxxxxxxx`
   - `RESEND_FROM_EMAIL=onboarding@resend.dev`
   - `RESEND_TEST_TO_EMAIL=manojkarajada.mk@gmail.com`
2. Replace `re_xxxxxxxxx` with your real Resend API key.
3. Utility added at `src/lib/email/resend.ts`.

Example call:

```ts
import { sendHelloWorldEmail } from '@/lib/email/resend'

await sendHelloWorldEmail()
```
