import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as { email?: string; fullName?: string; name?: string; title?: string }
    return typed.fullName || typed.title || typed.name || typed.email || fallback
  }

  return fallback
}

const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) {
    return 'Not set'
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return 'Not set'
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const canSubmitForReview = ({
  recruiter,
  stage,
  userID,
  userRole,
}: {
  recruiter: unknown
  stage: ApplicationStage
  userID: number | string
  userRole: string
}): boolean => {
  if (stage !== 'sourcedByRecruiter' && stage !== 'sentBackForCorrection') {
    return false
  }

  if (userRole === 'admin' || userRole === 'leadRecruiter') {
    return true
  }

  if (userRole !== 'recruiter') {
    return false
  }

  return String(extractRelationshipID(recruiter)) === String(userID)
}

type ApplicationDetailPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    success?: string
  }>
}

export default async function ApplicationDetailPage({ params, searchParams }: ApplicationDetailPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const applicationID = /^\d+$/.test(id) ? Number(id) : null

  if (!applicationID) {
    notFound()
  }

  try {
    const [application, stageHistory] = await Promise.all([
      payload.findByID({
        collection: 'applications',
        depth: 1,
        id: applicationID,
        overrideAccess: false,
        select: {
          candidate: true,
          candidateAppliedAt: true,
          candidateInvitedAt: true,
          id: true,
          job: true,
          latestComment: true,
          notes: true,
          recruiter: true,
          reviewedAt: true,
          reviewedBy: true,
          stage: true,
          submittedAt: true,
          updatedAt: true,
        },
        user,
      }),
      payload.find({
        collection: 'application-stage-history',
        depth: 1,
        limit: 100,
        pagination: false,
        overrideAccess: false,
        select: {
          actor: true,
          changedAt: true,
          comment: true,
          fromStage: true,
          id: true,
          toStage: true,
        },
        sort: '-changedAt',
        user,
        where: {
          application: {
            equals: applicationID,
          },
        },
      }),
    ])

    const stage = application.stage as ApplicationStage
    const stageLabel = APPLICATION_STAGE_LABELS[stage] || stage
    const allowSubmitForReview = canSubmitForReview({
      recruiter: application.recruiter,
      stage,
      userID: user.id,
      userRole: user.role,
    })
    const allowReview = (user.role === 'admin' || user.role === 'leadRecruiter') && stage === 'internalReviewPending'

    return (
      <section className="application-detail-page">
        <header className="application-detail-header">
          <div>
            <p className="application-detail-kicker">Application Detail</p>
            <h1>{readLabel(application.candidate)}</h1>
            <p>Job: {readLabel(application.job)} · Recruiter: {readLabel(application.recruiter)}</p>
          </div>
          <div className="application-detail-header-actions">
            <span className="application-detail-stage">{stageLabel}</span>
            <Link className="application-detail-header-btn" href={APP_ROUTES.internal.applications.list}>
              Back
            </Link>
          </div>
        </header>

        {resolvedSearchParams.success ? (
          <p className="application-detail-feedback">Application action completed successfully.</p>
        ) : null}

        <div className="application-detail-grid">
          <article className="application-detail-card">
            <h2>Timeline</h2>
            <div className="application-detail-info-list">
              <p><span>Submitted At</span>{formatDateTime(application.submittedAt)}</p>
              <p><span>Reviewed At</span>{formatDateTime(application.reviewedAt)}</p>
              <p><span>Reviewed By</span>{readLabel(application.reviewedBy, 'Not reviewed')}</p>
              <p><span>Candidate Invited At</span>{formatDateTime(application.candidateInvitedAt)}</p>
              <p><span>Candidate Applied At</span>{formatDateTime(application.candidateAppliedAt)}</p>
              <p><span>Last Updated</span>{formatDateTime(application.updatedAt)}</p>
            </div>
          </article>

          <article className="application-detail-card">
            <h2>Comments</h2>
            <div className="application-detail-comment-block">
              <p><span>Latest Comment</span>{application.latestComment || 'No comment'}</p>
              <p><span>Notes</span>{application.notes || 'No notes'}</p>
            </div>
          </article>
        </div>

        {(allowSubmitForReview || allowReview) ? (
          <article className="application-detail-card">
            <h2>Actions</h2>
            <div className="application-detail-actions-grid">
              {allowSubmitForReview ? (
                <form action={APP_ROUTES.internal.applications.submit} className="application-detail-form" method="post">
                  <input name="applicationId" type="hidden" value={String(application.id)} />
                  <label>
                    <span>Comment for Reviewer</span>
                    <textarea name="latestComment" placeholder="Summary for review queue..." rows={3} />
                  </label>
                  <button data-pending-label="Submitting..." type="submit">
                    Send For Review
                  </button>
                </form>
              ) : null}

              {allowReview ? (
                <form action={APP_ROUTES.internal.applications.review} className="application-detail-form" method="post">
                  <input name="applicationId" type="hidden" value={String(application.id)} />
                  <label>
                    <span>Review Comment</span>
                    <textarea name="latestComment" placeholder="Decision notes..." rows={3} />
                  </label>
                  <div className="application-detail-review-buttons">
                    <button data-pending-label="Approving..." name="action" type="submit" value="approve">
                      Approve
                    </button>
                    <button data-pending-label="Sending..." name="action" type="submit" value="sendBack">
                      Send Back
                    </button>
                    <button data-pending-label="Rejecting..." name="action" type="submit" value="reject">
                      Reject
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </article>
        ) : null}

        <article className="application-detail-card">
          <h2>Stage Activity</h2>
          {stageHistory.docs.length === 0 ? (
            <p className="application-detail-empty">No stage transitions recorded yet.</p>
          ) : (
            <div className="application-detail-history-list">
              {stageHistory.docs.map((entry) => (
                <article className="application-detail-history-item" key={`stage-history-${entry.id}`}>
                  <p>
                    {entry.fromStage
                      ? `${APPLICATION_STAGE_LABELS[entry.fromStage as ApplicationStage] || entry.fromStage} -> ${
                          APPLICATION_STAGE_LABELS[entry.toStage as ApplicationStage] || entry.toStage
                        }`
                      : APPLICATION_STAGE_LABELS[entry.toStage as ApplicationStage] || entry.toStage}
                  </p>
                  <small>Actor: {readLabel(entry.actor, 'System')}</small>
                  <small>{entry.comment || 'No comment'}</small>
                  <small>{formatDateTime(entry.changedAt)}</small>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    )
  } catch {
    notFound()
  }
}
