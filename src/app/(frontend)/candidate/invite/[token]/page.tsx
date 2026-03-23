import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { APP_ROUTES } from '@/lib/constants/routes'
import { findActiveCandidateInviteByToken } from '@/lib/candidates/invites'
import { extractRelationshipID } from '@/lib/utils/relationships'

const toNumberIfNumeric = (value: number | string | null): number | string | null => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return value
}

type CandidateInvitePageProps = {
  params: Promise<{
    token: string
  }>
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function CandidateInvitePage({ params, searchParams }: CandidateInvitePageProps) {
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const { token } = await params
  const invite = await findActiveCandidateInviteByToken({
    payload,
    token,
  })

  if (!invite) {
    return (
      <section className="public-home">
        <div className="public-card">
          <p className="eyebrow">Candidate Invite</p>
          <h1>Invite Link Invalid or Expired</h1>
          <p className="muted">
            This invite link is no longer active. Please request a fresh invite from the recruitment team.
          </p>
          <div className="public-actions">
            <Link className="button button-secondary" href={APP_ROUTES.candidate.login}>
              Candidate Login
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const candidateID = toNumberIfNumeric(extractRelationshipID(invite.candidate))
  const applicationID = toNumberIfNumeric(extractRelationshipID(invite.application))

  if (!candidateID || !applicationID) {
    return (
      <section className="public-home">
        <div className="public-card">
          <p className="eyebrow">Candidate Invite</p>
          <h1>Invite Link Invalid</h1>
          <p className="muted">This invite is missing candidate/application linkage. Please contact support.</p>
        </div>
      </section>
    )
  }

  const [candidate, application] = await Promise.all([
    payload.findByID({
      collection: 'candidates',
      depth: 0,
      id: candidateID,
      overrideAccess: true,
    }),
    payload.findByID({
      collection: 'applications',
      depth: 1,
      id: applicationID,
      overrideAccess: true,
    }),
  ])

  const jobTitle = String((application.job as { title?: string } | undefined)?.title || 'Selected Job')
  const submitPath = `${APP_ROUTES.candidate.inviteBase}/${encodeURIComponent(token)}/submit`

  return (
    <section className="auth-page">
      <div className="auth-card" style={{ maxWidth: '44rem' }}>
        <p className="eyebrow">Secure Candidate Application</p>
        <h1>Complete Your Application</h1>
        <p className="muted">
          Role: <strong>{jobTitle}</strong>
        </p>
        <p className="muted small">This invite is single-use and token protected.</p>
        {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}

        <form action={submitPath} className="auth-form" method="post">
          <label className="form-field" htmlFor="fullName">
            Full Name
          </label>
          <input
            className="input"
            defaultValue={candidate.fullName || ''}
            id="fullName"
            name="fullName"
            required
            type="text"
          />

          <label className="form-field" htmlFor="email">
            Email
          </label>
          <input
            className="input"
            defaultValue={candidate.email || String(invite.inviteEmail || '')}
            id="email"
            name="email"
            required
            type="email"
          />

          <label className="form-field" htmlFor="phone">
            Phone
          </label>
          <input className="input" defaultValue={candidate.phone || ''} id="phone" name="phone" required type="tel" />

          <label className="form-field" htmlFor="currentLocation">
            Current Location
          </label>
          <input
            className="input"
            defaultValue={candidate.currentLocation || ''}
            id="currentLocation"
            name="currentLocation"
            type="text"
          />

          <label className="form-field" htmlFor="currentCompany">
            Current Company
          </label>
          <input
            className="input"
            defaultValue={candidate.currentCompany || ''}
            id="currentCompany"
            name="currentCompany"
            type="text"
          />

          <label className="form-field" htmlFor="currentRole">
            Current Role
          </label>
          <input
            className="input"
            defaultValue={candidate.currentRole || ''}
            id="currentRole"
            name="currentRole"
            type="text"
          />

          <label className="form-field" htmlFor="totalExperienceYears">
            Total Experience (Years)
          </label>
          <input
            className="input"
            defaultValue={candidate.totalExperienceYears ?? ''}
            id="totalExperienceYears"
            min={0}
            name="totalExperienceYears"
            step="0.1"
            type="number"
          />

          <label className="form-field" htmlFor="expectedSalary">
            Expected Salary
          </label>
          <input
            className="input"
            defaultValue={candidate.expectedSalary ?? ''}
            id="expectedSalary"
            min={0}
            name="expectedSalary"
            type="number"
          />

          <label className="form-field" htmlFor="noticePeriodDays">
            Notice Period (Days)
          </label>
          <input
            className="input"
            defaultValue={candidate.noticePeriodDays ?? ''}
            id="noticePeriodDays"
            min={0}
            name="noticePeriodDays"
            type="number"
          />

          <label className="form-field" htmlFor="linkedInURL">
            LinkedIn URL
          </label>
          <input
            className="input"
            defaultValue={candidate.linkedInURL || ''}
            id="linkedInURL"
            name="linkedInURL"
            type="url"
          />

          <label className="form-field" htmlFor="portfolioURL">
            Portfolio URL
          </label>
          <input
            className="input"
            defaultValue={candidate.portfolioURL || ''}
            id="portfolioURL"
            name="portfolioURL"
            type="url"
          />

          <label className="form-field" htmlFor="notes">
            Notes / Cover Note
          </label>
          <textarea
            className="input"
            defaultValue={candidate.notes || ''}
            id="notes"
            name="notes"
            placeholder="Share any additional details relevant to this application."
            rows={4}
          />

          <label className="form-field" htmlFor="password">
            Create Password
          </label>
          <input
            className="input"
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />

          <label className="form-field" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            className="input"
            id="confirmPassword"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />

          <button className="button" type="submit">
            Submit Application
          </button>
        </form>
      </div>
    </section>
  )
}
