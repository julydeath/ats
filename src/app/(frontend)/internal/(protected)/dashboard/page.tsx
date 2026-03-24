import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import type { Application, ApplicationStageHistory } from '@/payload-types'
import { requireInternalUser } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
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

const toDayMonth = (value: Date): string =>
  value.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
  })

const toRelativeTime = (value: string): string => {
  const time = new Date(value).getTime()
  const now = Date.now()
  const diffMs = Math.max(now - time, 0)
  const mins = Math.floor(diffMs / (1000 * 60))

  if (mins < 1) {
    return 'Just now'
  }

  if (mins < 60) {
    return `${mins} mins ago`
  }

  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return `${hours} hours ago`
  }

  const days = Math.floor(hours / 24)
  return `${days} days ago`
}

const toCycleDate = (value: Date): string =>
  value.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const toWeekdayShort = (value: Date): string =>
  value.toLocaleDateString('en-US', {
    weekday: 'short',
  })

const toInitials = (value: string): string =>
  value
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

type VelocityPoint = {
  count: number
  dayLabel: string
  isHighlighted: boolean
}

const buildVelocitySeries = (items: Pick<ApplicationStageHistory, 'changedAt'>[]): VelocityPoint[] => {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const pointDate = new Date(now)
    pointDate.setDate(now.getDate() - (6 - index))
    pointDate.setHours(0, 0, 0, 0)

    return {
      key: pointDate.toISOString().slice(0, 10),
      label: toWeekdayShort(pointDate).toUpperCase(),
    }
  })

  const countByDay = new Map<string, number>()

  items.forEach((item) => {
    const key = new Date(item.changedAt).toISOString().slice(0, 10)
    countByDay.set(key, (countByDay.get(key) || 0) + 1)
  })

  const series = weekDays.map((day) => ({
    count: countByDay.get(day.key) || 0,
    dayLabel: day.label,
    isHighlighted: false,
  }))

  const max = Math.max(...series.map((item) => item.count), 0)
  let highlighted = false

  return series.map((item) => {
    if (highlighted || max === 0 || item.count !== max) {
      return item
    }

    highlighted = true

    return {
      ...item,
      isHighlighted: true,
    }
  })
}

type RecruiterPerformance = {
  acceptance: number
  approvals: number
  name: string
  reviewed: number
}

const buildRecruiterPerformance = (
  items: Pick<ApplicationStageHistory, 'recruiter' | 'toStage'>[],
): RecruiterPerformance[] => {
  const map = new Map<string, RecruiterPerformance>()

  items.forEach((item) => {
    const recruiterName = readLabel(item.recruiter)
    const existing = map.get(recruiterName)
    const reviewedIncrement = 1
    const approvalsIncrement = item.toStage === 'internalReviewApproved' ? 1 : 0

    if (existing) {
      existing.reviewed += reviewedIncrement
      existing.approvals += approvalsIncrement
      return
    }

    map.set(recruiterName, {
      acceptance: 0,
      approvals: approvalsIncrement,
      name: recruiterName,
      reviewed: reviewedIncrement,
    })
  })

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      acceptance: row.reviewed > 0 ? Math.round((row.approvals / row.reviewed) * 100) : 0,
    }))
    .sort((a, b) => b.reviewed - a.reviewed)
    .slice(0, 4)
}

const REVIEW_STAGE_TONE_CLASS: Record<string, 'green' | 'red' | 'blue'> = {
  internalReviewApproved: 'green',
  internalReviewRejected: 'red',
  sentBackForCorrection: 'blue',
}

export default async function InternalDashboardPage() {
  const user = await requireInternalUser()
  const payload = await getPayload({ config: configPromise })

  if (user.role === 'leadRecruiter') {
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)
    last30Days.setHours(0, 0, 0, 0)

    const cycleEnds = new Date()
    cycleEnds.setDate(cycleEnds.getDate() + 7)

    const [activeMandatesCount, pendingReviewApplications, reviewHistory] = await Promise.all([
      payload.count({
        collection: 'jobs',
        overrideAccess: false,
        user,
        where: {
          status: {
            in: ['active', 'onHold'],
          },
        },
      }),
      payload.find({
        collection: 'applications',
        depth: 1,
        limit: 6,
        overrideAccess: false,
        select: {
          candidate: true,
          id: true,
          job: true,
          recruiter: true,
          updatedAt: true,
        },
        sort: '-updatedAt',
        user,
        where: {
          stage: {
            equals: 'internalReviewPending',
          },
        },
      }),
      payload.find({
        collection: 'application-stage-history',
        depth: 1,
        limit: 250,
        pagination: false,
        overrideAccess: false,
        select: {
          candidate: true,
          changedAt: true,
          comment: true,
          id: true,
          recruiter: true,
          toStage: true,
        },
        sort: '-changedAt',
        user,
        where: {
          and: [
            {
              toStage: {
                in: ['internalReviewApproved', 'internalReviewRejected', 'sentBackForCorrection'],
              },
            },
            {
              changedAt: {
                greater_than_equal: last30Days.toISOString(),
              },
            },
          ],
        },
      }),
    ])

    const typedPendingReviews = pendingReviewApplications.docs as Pick<
      Application,
      'id' | 'candidate' | 'job' | 'recruiter' | 'updatedAt'
    >[]
    const typedReviewHistory = reviewHistory.docs as Pick<
      ApplicationStageHistory,
      'id' | 'candidate' | 'changedAt' | 'comment' | 'recruiter' | 'toStage'
    >[]

    const velocitySeries = buildVelocitySeries(typedReviewHistory.map((item) => ({ changedAt: item.changedAt })))
    const recruiterPerformance = buildRecruiterPerformance(
      typedReviewHistory.map((item) => ({
        recruiter: item.recruiter,
        toStage: item.toStage,
      })),
    )
    const reviewedCount = typedReviewHistory.length
    const approvalsCount = typedReviewHistory.filter((item) => item.toStage === 'internalReviewApproved').length
    const approvalRate = reviewedCount > 0 ? Math.round((approvalsCount / reviewedCount) * 100) : 0
    const averagePendingReviewHours =
      typedPendingReviews.length > 0
        ? typedPendingReviews.reduce((sum, app) => {
            const ageHours = Math.max(Date.now() - new Date(app.updatedAt).getTime(), 0) / (1000 * 60 * 60)
            return sum + ageHours
          }, 0) / typedPendingReviews.length
        : 0
    const maxVelocityCount = Math.max(...velocitySeries.map((point) => point.count), 1)

    return (
      <section className="lead-overview-page">
        <div className="lead-overview-header-row">
          <div>
            <h1>Recruitment Intelligence</h1>
            <p>Strategic oversight for the current hiring cycle.</p>
          </div>
          <div className="lead-cycle-chip">Cycle Ends: {toCycleDate(cycleEnds)}</div>
        </div>

        <section className="lead-top-grid">
          <article className="ops-card lead-mandates-card">
            <p className="lead-card-kicker">Active Mandates</p>
            <p className="lead-mandates-value">{activeMandatesCount.totalDocs}</p>
            <p className="lead-mandates-meta">
              <span className="lead-positive-pill">
                +{Math.max(Math.round(typedPendingReviews.length / 2), 1)} this week
              </span>
              <span>{Math.round(averagePendingReviewHours * 10) / 10}h avg review wait</span>
            </p>
          </article>

          <article className="ops-card lead-velocity-card">
            <div className="lead-card-head">
              <div>
                <p className="lead-card-kicker">Review Queue Summary</p>
                <h2>Operational Velocity</h2>
              </div>
              <div className="lead-velocity-legend">
                <span />
                <p>Reviews Pending ({typedPendingReviews.length})</p>
              </div>
            </div>
            <div className="lead-velocity-bars">
              {velocitySeries.map((point) => {
                const heightPercent = Math.max(Math.round((point.count / maxVelocityCount) * 100), 8)
                return (
                  <div className="lead-velocity-point" key={point.dayLabel}>
                    <div className="lead-velocity-track">
                      <span
                        className={point.isHighlighted ? 'lead-velocity-bar lead-velocity-bar-highlight' : 'lead-velocity-bar'}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <p>{point.dayLabel}</p>
                  </div>
                )
              })}
            </div>
          </article>
        </section>

        <section className="lead-bottom-grid">
          <article className="ops-card lead-pending-card">
            <div className="lead-card-head">
              <h2>Pending Candidate Reviews</h2>
              <Link href={APP_ROUTES.internal.applications.reviewQueue}>View All Queue</Link>
            </div>
            {typedPendingReviews.length === 0 ? (
              <p className="ops-empty-text">No pending submissions. Review queue is clear.</p>
            ) : (
              <div className="lead-pending-list">
                {typedPendingReviews.slice(0, 4).map((application) => (
                  <article className="lead-pending-item" key={application.id}>
                    <div className="lead-pending-avatar">{toInitials(readLabel(application.candidate, 'CD'))}</div>
                    <div className="lead-pending-copy">
                      <p className="lead-pending-name">{readLabel(application.candidate)}</p>
                      <p className="lead-pending-meta">
                        {readLabel(application.job)} | Recruiter: {readLabel(application.recruiter)}
                      </p>
                    </div>
                    <span className="lead-pending-time">{toRelativeTime(application.updatedAt)}</span>
                  </article>
                ))}
              </div>
            )}
          </article>

          <div className="lead-right-stack">
            <article className="ops-card lead-performance-card">
              <div className="lead-card-head">
                <h2>Recruiter Performance</h2>
                <span>{approvalRate}% Approval</span>
              </div>
              {recruiterPerformance.length === 0 ? (
                <p className="ops-empty-text">No recent review decisions yet.</p>
              ) : (
                <div className="lead-performance-list">
                  {recruiterPerformance.map((row) => (
                    <article className="lead-performance-item" key={row.name}>
                      <span className="lead-performance-avatar">{toInitials(row.name)}</span>
                      <div>
                        <p className="lead-performance-name">{row.name}</p>
                        <p className="lead-performance-meta">{row.acceptance}% acceptance</p>
                      </div>
                      <div className="lead-performance-track">
                        <span style={{ width: `${Math.max(row.acceptance, 8)}%` }} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="ops-card lead-actions-card">
              <h2>Recent Review Actions</h2>
              {typedReviewHistory.length === 0 ? (
                <p className="ops-empty-text">No recent actions available.</p>
              ) : (
                <div className="lead-action-list">
                  {typedReviewHistory.slice(0, 4).map((entry) => (
                    <article className="lead-action-item" key={entry.id}>
                      <span className={`lead-action-dot lead-action-dot-${REVIEW_STAGE_TONE_CLASS[entry.toStage] || 'blue'}`} />
                      <div>
                        <p className="lead-action-title">
                          {APPLICATION_STAGE_LABELS[entry.toStage]}: {readLabel(entry.candidate)}
                        </p>
                        <p className="lead-action-meta">
                          Recruiter: {readLabel(entry.recruiter)} • {toRelativeTime(entry.changedAt)}
                        </p>
                        {entry.comment ? <p className="lead-action-comment">{entry.comment}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>
      </section>
    )
  }

  if (user.role !== 'admin') {
    return (
      <section className="ops-placeholder-page">
        <article className="ops-card">
          <p className="ops-kicker">Dashboard</p>
          <h1>Role Dashboard In Progress</h1>
          <p>Recruiter dashboard will be updated to your new design in the next step.</p>
          <div className="ops-inline-actions">
            <Link className="ops-btn ops-btn-primary" href={APP_ROUTES.internal.jobs.assigned}>
              Open Jobs
            </Link>
            <Link className="ops-btn ops-btn-secondary" href={APP_ROUTES.internal.schedule}>
              Open Schedule
            </Link>
          </div>
        </article>
      </section>
    )
  }

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const [
    activeClientsCount,
    openJobsCount,
    candidateCount,
    newCandidatesCount,
    applications,
    recruiterAssignments,
    clientLeadAssignments,
    jobLeadAssignments,
  ] = await Promise.all([
    payload.count({
      collection: 'clients',
      overrideAccess: false,
      user,
      where: {
        status: {
          equals: 'active',
        },
      },
    }),
    payload.count({
      collection: 'jobs',
      overrideAccess: false,
      user,
      where: {
        status: {
          in: ['active', 'onHold'],
        },
      },
    }),
    payload.count({
      collection: 'candidates',
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'candidates',
      overrideAccess: false,
      user,
      where: {
        createdAt: {
          greater_than_equal: weekStart.toISOString(),
        },
      },
    }),
    payload.find({
      collection: 'applications',
      depth: 1,
      limit: 200,
      pagination: false,
      overrideAccess: false,
      select: {
        candidate: true,
        id: true,
        job: true,
        stage: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'recruiter-job-assignments',
      depth: 1,
      limit: 300,
      pagination: false,
      overrideAccess: false,
      select: {
        recruiter: true,
        status: true,
      },
      sort: '-updatedAt',
      user,
    }),
    payload.count({
      collection: 'client-lead-assignments',
      overrideAccess: false,
      user,
      where: {
        status: {
          equals: 'active',
        },
      },
    }),
    payload.count({
      collection: 'job-lead-assignments',
      overrideAccess: false,
      user,
      where: {
        status: {
          equals: 'active',
        },
      },
    }),
  ])

  const dateRangeLabel = `${toDayMonth(weekStart)} - ${toDayMonth(new Date())}`
  const pendingReviews = applications.docs.filter((application) => application.stage === 'internalReviewPending').length
  const stageTitleByKey: Record<string, string> = {
    candidateApplied: 'Job Placement Successful',
    candidateInvited: 'Interview Scheduled',
    internalReviewApproved: 'Candidate Approved',
    internalReviewPending: 'New Candidate Registered',
    internalReviewRejected: 'Candidate Rejected',
    sentBackForCorrection: 'Submission Sent Back',
    sourcedByRecruiter: 'Candidate Sourced',
  }

  const recentActivity = applications.docs.slice(0, 4).map((item) => ({
    id: String(item.id),
    subtitle: `${readLabel(item.candidate)} applied for ${readLabel(item.job)}`,
    time: toRelativeTime(item.updatedAt),
    title: stageTitleByKey[item.stage] || 'Application Updated',
    tone:
      item.stage === 'candidateApplied'
        ? 'green'
        : item.stage === 'internalReviewPending'
          ? 'blue'
          : item.stage === 'sentBackForCorrection' || item.stage === 'internalReviewRejected'
            ? 'orange'
            : 'slate',
  }))

  const activeAssignments = recruiterAssignments.docs.filter((item) => item.status === 'active')
  const recruiterCountByID = new Map<string, { count: number; name: string }>()

  activeAssignments.forEach((assignment) => {
    const recruiterName = readLabel(assignment.recruiter)
    const recruiterID =
      assignment.recruiter && typeof assignment.recruiter === 'object' && 'id' in assignment.recruiter
        ? String((assignment.recruiter as { id: string | number }).id)
        : recruiterName

    const existing = recruiterCountByID.get(recruiterID)
    if (existing) {
      existing.count += 1
      return
    }

    recruiterCountByID.set(recruiterID, {
      count: 1,
      name: recruiterName,
    })
  })

  const recruiterLoad = Array.from(recruiterCountByID.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  const maxRecruiterLoad = Math.max(...recruiterLoad.map((item) => item.count), 1)

  return (
    <section className="admin-overview-page">
      <div className="admin-overview-header-row">
        <div>
          <p className="admin-overview-kicker">HR Operational Intelligence</p>
          <h1>Admin Overview</h1>
        </div>
        <div className="admin-date-chip">{dateRangeLabel}</div>
      </div>

      <section className="admin-kpi-grid">
        <article className="admin-kpi-card admin-kpi-card-blue">
          <p className="admin-kpi-label">Active Clients</p>
          <p className="admin-kpi-value">{activeClientsCount.totalDocs}</p>
          <span className="admin-kpi-trend admin-kpi-trend-positive">+12%</span>
        </article>
        <article className="admin-kpi-card admin-kpi-card-light">
          <p className="admin-kpi-label">Open Jobs</p>
          <p className="admin-kpi-value">{openJobsCount.totalDocs}</p>
          <span className="admin-kpi-trend admin-kpi-trend-positive">+4%</span>
        </article>
        <article className="admin-kpi-card admin-kpi-card-dark">
          <p className="admin-kpi-label">Leads Assigned</p>
          <p className="admin-kpi-value">{clientLeadAssignments.totalDocs + jobLeadAssignments.totalDocs}</p>
          <span className="admin-kpi-trend admin-kpi-trend-negative">-2%</span>
        </article>
        <article className="admin-kpi-card admin-kpi-card-light">
          <p className="admin-kpi-label">Total Candidates</p>
          <p className="admin-kpi-value">{candidateCount.totalDocs.toLocaleString('en-US')}</p>
          <span className="admin-kpi-trend admin-kpi-trend-positive">+18%</span>
        </article>
      </section>

      <section className="admin-overview-grid">
        <article className="ops-card admin-activity-card">
          <div className="admin-card-head">
            <h2>Recent Activity</h2>
            <Link href={APP_ROUTES.internal.applications.list}>View All Logs</Link>
          </div>

          <div className="admin-activity-list">
            {recentActivity.length === 0 ? (
              <p className="ops-empty-text">No recent activity.</p>
            ) : (
              recentActivity.map((activity) => (
                <article className="admin-activity-item" key={activity.id}>
                  <span className={`admin-activity-dot admin-activity-dot-${activity.tone}`} />
                  <div className="admin-activity-copy">
                    <p className="admin-activity-title">{activity.title}</p>
                    <p className="admin-activity-subtitle">{activity.subtitle}</p>
                  </div>
                  <span className="admin-activity-time">{activity.time}</span>
                </article>
              ))
            )}
          </div>

          <div className="admin-reports-empty">
            <p className="admin-reports-title">No Reports Generated</p>
            <p className="admin-reports-subtitle">
              You have not generated any recruitment performance reports for this period yet.
            </p>
            <button className="ops-btn ops-btn-secondary" type="button">
              Create First Report
            </button>
          </div>
        </article>

        <div className="admin-right-stack">
          <article className="ops-card">
            <h2>Quick Actions</h2>
            <div className="admin-quick-grid">
              <Link className="admin-quick-action" href={APP_ROUTES.internal.clients.list}>
                Add Client
              </Link>
              <Link className="admin-quick-action" href={APP_ROUTES.internal.assignments.head}>
                Assign Leads
              </Link>
              <Link className="admin-quick-action" href={`${APP_ROUTES.internal.jobs.assigned}#create-job`}>
                Post Job
              </Link>
              <Link className="admin-quick-action" href={APP_ROUTES.internal.candidates.new}>
                Bulk Upload
              </Link>
            </div>

            <div className="admin-pending-block">
              <p className="admin-pending-heading">Pending Tasks</p>
              <div className="admin-task admin-task-critical">
                Verify {Math.max(newCandidatesCount.totalDocs, pendingReviews)} New Candidates
              </div>
              <div className="admin-task">Client Meeting in 2h</div>
            </div>
          </article>

          <article className="ops-card admin-load-card">
            <div className="admin-card-head">
              <h2>Recruiter Load</h2>
              <span>Live</span>
            </div>

            <div className="admin-load-list">
              {recruiterLoad.length === 0 ? (
                <p className="ops-empty-text">No recruiter assignments yet.</p>
              ) : (
                recruiterLoad.map((item) => {
                  const percent = Math.max(Math.round((item.count / maxRecruiterLoad) * 100), 10)
                  return (
                    <article className="admin-load-item" key={item.name}>
                      <p>{item.name}</p>
                      <span>{percent}%</span>
                      <div className="admin-load-track">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                    </article>
                  )
                })
              )}
            </div>
            <Link className="admin-load-plus" href={APP_ROUTES.internal.assignments.lead}>
              +
            </Link>
          </article>
        </div>
      </section>
    </section>
  )
}
