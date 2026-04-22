import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import type { InternalRole } from '@/lib/constants/roles'

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

const getAllowedTargets = ({
  role,
  stage,
}: {
  role: InternalRole
  stage: ApplicationStage
}): ApplicationStage[] => {
  if (role === 'admin') {
    return ['sourced', 'screened', 'submittedToClient', 'interviewScheduled', 'interviewCleared', 'offerReleased', 'joined', 'rejected'].filter(
      (item) => item !== stage,
    ) as ApplicationStage[]
  }

  if (role === 'recruiter') {
    if (stage === 'screened') return ['submittedToClient']
    if (stage === 'submittedToClient') return ['interviewScheduled', 'rejected']
    if (stage === 'interviewScheduled') return ['interviewCleared', 'rejected']
    if (stage === 'interviewCleared') return ['offerReleased', 'rejected']
    if (stage === 'offerReleased') return ['joined', 'rejected']
    return []
  }

  if (stage === 'sourced') return ['screened', 'rejected']
  if (stage === 'screened') return ['sourced', 'submittedToClient', 'rejected']
  if (stage === 'submittedToClient') return ['interviewScheduled', 'rejected']
  if (stage === 'interviewScheduled') return ['interviewCleared', 'rejected']
  if (stage === 'interviewCleared') return ['offerReleased', 'rejected']
  if (stage === 'offerReleased') return ['joined', 'rejected']
  return []
}

type ApplicationDetailPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    error?: string
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
    const [application, stageHistory, interviews, placements] = await Promise.all([
      payload.findByID({
        collection: 'applications',
        depth: 1,
        id: applicationID,
        overrideAccess: false,
        select: {
          applicationCode: true,
          candidate: true,
          clientBillRate: true,
          id: true,
          interviewAt: true,
          interviewClearedAt: true,
          interviewScheduledAt: true,
          job: true,
          joinedAt: true,
          latestComment: true,
          notes: true,
          offerReleasedAt: true,
          payRate: true,
          pipelineSource: true,
          recruiter: true,
          rejectedAt: true,
          screenedAt: true,
          sourcedAt: true,
          stage: true,
          submissionType: true,
          submittedAt: true,
          submittedToClientAt: true,
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
      payload.find({
        collection: 'interviews',
        depth: 0,
        limit: 10,
        overrideAccess: false,
        pagination: false,
        select: {
          endTime: true,
          id: true,
          interviewCode: true,
          interviewRound: true,
          interviewerName: true,
          mode: true,
          startTime: true,
          status: true,
          updatedAt: true,
        },
        sort: '-startTime',
        user,
        where: {
          application: {
            equals: applicationID,
          },
        },
      }),
      payload.find({
        collection: 'placements',
        depth: 0,
        limit: 5,
        overrideAccess: false,
        pagination: false,
        select: {
          actualEndDate: true,
          actualStartDate: true,
          id: true,
          placementCode: true,
          placementType: true,
          status: true,
          tentativeStartDate: true,
          updatedAt: true,
        },
        sort: '-updatedAt',
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
    const stageTargets = getAllowedTargets({
      role: user.role,
      stage,
    })

    return (
      <section className="application-detail-page">
        <header className="application-detail-header">
          <div>
            <p className="application-detail-kicker">Application Detail</p>
            <h1>{readLabel(application.candidate)}</h1>
            <p>
              {application.applicationCode || `APP-${application.id}`} · Job: {readLabel(application.job)} · Recruiter:{' '}
              {readLabel(application.recruiter)}
            </p>
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
        {resolvedSearchParams.error ? (
          <p className="application-detail-feedback application-detail-feedback-error">{resolvedSearchParams.error}</p>
        ) : null}

        <div className="application-detail-grid">
          <article className="application-detail-card">
            <h2>Flow Timeline</h2>
            <div className="application-detail-info-list">
              <p>
                <span>Sourced At</span>
                {formatDateTime(application.sourcedAt)}
              </p>
              <p>
                <span>Screened At</span>
                {formatDateTime(application.screenedAt)}
              </p>
              <p>
                <span>Submitted To Client At</span>
                {formatDateTime(application.submittedToClientAt || application.submittedAt)}
              </p>
              <p>
                <span>Interview Scheduled At</span>
                {formatDateTime(application.interviewScheduledAt || application.interviewAt)}
              </p>
              <p>
                <span>Interview Cleared At</span>
                {formatDateTime(application.interviewClearedAt)}
              </p>
              <p>
                <span>Offer Released At</span>
                {formatDateTime(application.offerReleasedAt)}
              </p>
              <p>
                <span>Joined At</span>
                {formatDateTime(application.joinedAt)}
              </p>
              <p>
                <span>Rejected At</span>
                {formatDateTime(application.rejectedAt)}
              </p>
              <p>
                <span>Last Updated</span>
                {formatDateTime(application.updatedAt)}
              </p>
            </div>
          </article>

          <article className="application-detail-card">
            <h2>Submission & Notes</h2>
            <div className="application-detail-comment-block">
              <p>
                <span>Latest Comment</span>
                {application.latestComment || 'No comment'}
              </p>
              <p>
                <span>Notes</span>
                {application.notes || 'No notes'}
              </p>
              <p>
                <span>Pipeline Source</span>
                {application.pipelineSource || 'Not set'}
              </p>
              <p>
                <span>Submission Type</span>
                {application.submissionType || 'Not set'}
              </p>
              <p>
                <span>Client Bill Rate</span>
                {application.clientBillRate || 'Not set'}
              </p>
              <p>
                <span>Pay Rate</span>
                {application.payRate || 'Not set'}
              </p>
            </div>
          </article>
        </div>

        {stageTargets.length > 0 ? (
          <article className="application-detail-card">
            <h2>Update Stage</h2>
            <form action={APP_ROUTES.internal.applications.stage} className="application-detail-form" method="post">
              <input name="applicationId" type="hidden" value={String(application.id)} />
              <input
                name="redirectTo"
                type="hidden"
                value={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}
              />
              <label>
                <span>Move To</span>
                <select defaultValue={stageTargets[0]} name="toStage">
                  {stageTargets.map((target) => (
                    <option key={`application-${application.id}-target-${target}`} value={target}>
                      {APPLICATION_STAGE_LABELS[target]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Comment</span>
                <textarea name="latestComment" placeholder="Add context for this transition..." rows={3} />
              </label>
              <button data-pending-label="Updating..." type="submit">
                Update Stage
              </button>
            </form>
          </article>
        ) : null}

        <div className="application-detail-grid">
          <article className="application-detail-card">
            <h2>Interviews</h2>
            {interviews.docs.length === 0 ? (
              <p className="application-detail-empty">No interviews scheduled yet.</p>
            ) : (
              <div className="application-detail-history-list">
                {interviews.docs.map((item) => (
                  <article className="application-detail-history-item" key={`interview-${item.id}`}>
                    <p>{item.interviewCode || `INT-${item.id}`}</p>
                    <small>
                      {String(item.interviewRound || 'screening')} · {String(item.status || 'scheduled')} ·{' '}
                      {String(item.mode || 'video')}
                    </small>
                    <small>
                      {item.interviewerName || 'Interviewer not set'} · {formatDateTime(item.startTime)} to{' '}
                      {formatDateTime(item.endTime)}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="application-detail-card">
            <h2>Placements</h2>
            {placements.docs.length === 0 ? (
              <p className="application-detail-empty">No placement record yet.</p>
            ) : (
              <div className="application-detail-history-list">
                {placements.docs.map((item) => (
                  <article className="application-detail-history-item" key={`placement-${item.id}`}>
                    <p>{item.placementCode || `PLC-${item.id}`}</p>
                    <small>
                      {String(item.placementType || 'recurringRevenue')} · {String(item.status || 'active')}
                    </small>
                    <small>
                      Tentative: {formatDateTime(item.tentativeStartDate)} · Start: {formatDateTime(item.actualStartDate)}
                    </small>
                    <small>End: {formatDateTime(item.actualEndDate)}</small>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>

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
