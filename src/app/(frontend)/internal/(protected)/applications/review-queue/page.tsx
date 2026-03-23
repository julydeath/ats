import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'
import { extractRelationshipID } from '@/lib/utils/relationships'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as {
      email?: string
      fullName?: string
      name?: string
      title?: string
    }

    return typed.fullName || typed.title || typed.name || typed.email || fallback
  }

  return fallback
}

type ApplicationsReviewQueuePageProps = {
  searchParams?: Promise<{
    error?: string
    success?: string
  }>
}

export default async function ApplicationsReviewQueuePage({ searchParams }: ApplicationsReviewQueuePageProps) {
  const user = await requireInternalRole(['admin', 'headRecruiter', 'leadRecruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const canReview = user.role === 'admin' || user.role === 'leadRecruiter'

  const pendingApplications = await payload.find({
    collection: 'applications',
    depth: 1,
    limit: 120,
    pagination: false,
    overrideAccess: false,
    select: {
      candidate: true,
      id: true,
      job: true,
      latestComment: true,
      notes: true,
      recruiter: true,
      stage: true,
      updatedAt: true,
    },
    sort: 'updatedAt',
    user,
    where: {
      stage: {
        equals: 'internalReviewPending',
      },
    },
  })

  const byRecruiter = new Map<string, number>()
  pendingApplications.docs.forEach((application) => {
    const recruiterID = extractRelationshipID(application.recruiter)
    const key = recruiterID ? String(recruiterID) : 'unknown'
    byRecruiter.set(key, (byRecruiter.get(key) || 0) + 1)
  })

  const maxLoadPerRecruiter = byRecruiter.size ? Math.max(...Array.from(byRecruiter.values())) : 0

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">Internal Review Queue</p>
        <h1>Lead Review Desk</h1>
        <p className="panel-intro">
          Signed in as <strong>{INTERNAL_ROLE_LABELS[user.role]}</strong>. Recruiter submissions stay in this
          queue until approved, rejected, or sent back.
        </p>
        {resolvedSearchParams.success ? <p className="muted small">Review action completed.</p> : null}
        {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}
        <div className="public-actions">
          <Link className="button button-secondary" href={APP_ROUTES.internal.applications.list}>
            Back to Applications
          </Link>
        </div>
      </article>

      <article className="panel">
        <h2>Queue Guidance</h2>
        <div className="workflow-steps">
          <div className="workflow-step">
            <span className="workflow-step-number">1</span>
            <div>
              <p className="workflow-step-title">Open candidate and job context</p>
              <p className="workflow-step-desc">Verify fit against role requirements before decision.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">2</span>
            <div>
              <p className="workflow-step-title">Record clear review comment</p>
              <p className="workflow-step-desc">Mention why approved, rejected, or sent back for correction.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">3</span>
            <div>
              <p className="workflow-step-title">Take action</p>
              <p className="workflow-step-desc">Each action creates stage history for audit and tracking.</p>
            </div>
          </div>
        </div>
      </article>

      <article className="panel">
        <h2>Queue Snapshot</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <p className="kpi-value">{pendingApplications.docs.length}</p>
            <p className="kpi-label">Pending Reviews</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{byRecruiter.size}</p>
            <p className="kpi-label">Recruiters In Queue</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{maxLoadPerRecruiter}</p>
            <p className="kpi-label">Highest Queue Load (Single Recruiter)</p>
          </div>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Pending Review Board</h2>
        {pendingApplications.docs.length === 0 ? (
          <p className="board-empty">No applications are waiting for internal review right now.</p>
        ) : (
          <div className="kanban-cards">
            {pendingApplications.docs.map((application) => (
              <article className="kanban-card" key={`review-app-${application.id}`}>
                <p className="kanban-title">{readLabel(application.candidate)}</p>
                <p className="kanban-meta">Job: {readLabel(application.job)}</p>
                <p className="kanban-meta">Recruiter: {readLabel(application.recruiter)}</p>
                <p className="kanban-meta">
                  Stage: {APPLICATION_STAGE_LABELS[application.stage] || application.stage}
                </p>
                <p className="kanban-meta">Latest Comment: {application.latestComment || 'No comment provided'}</p>
                <p className="kanban-meta">Notes: {application.notes || 'No notes'}</p>
                <p className="kanban-meta">
                  Waiting Since: {new Date(application.updatedAt).toLocaleString()}
                </p>

                <div className="public-actions">
                  <Link
                    className="button button-secondary"
                    href={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}
                  >
                    Open Full Activity
                  </Link>
                </div>

                {canReview ? (
                  <form action={APP_ROUTES.internal.applications.review} className="auth-form" method="post">
                    <input name="applicationId" type="hidden" value={application.id} />
                    <label className="form-field" htmlFor={`review-note-${application.id}`}>
                      Review Comment
                    </label>
                    <textarea
                      className="input"
                      id={`review-note-${application.id}`}
                      name="latestComment"
                      placeholder="Write a clear decision note"
                      rows={3}
                    />
                    <div className="public-actions">
                      <button
                        className="button"
                        data-confirm-message="Approve this application?"
                        data-pending-label="Approving..."
                        name="action"
                        type="submit"
                        value="approve"
                      >
                        Approve
                      </button>
                      <button
                        className="button button-secondary"
                        data-confirm-message="Send this application back for correction?"
                        data-pending-label="Sending back..."
                        name="action"
                        type="submit"
                        value="sendBack"
                      >
                        Send Back For Correction
                      </button>
                      <button
                        className="button button-secondary"
                        data-confirm-message="Reject this application?"
                        data-pending-label="Rejecting..."
                        name="action"
                        type="submit"
                        value="reject"
                      >
                        Reject
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="muted small">
                    Monitor-only mode. Admin and Lead Recruiter can perform review actions.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
