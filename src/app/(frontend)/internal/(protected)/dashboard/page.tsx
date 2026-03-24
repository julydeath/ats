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

const toMonthDay = (value: string): { day: string; month: string } => {
  const date = new Date(value)

  return {
    day: date.toLocaleDateString('en-US', { day: '2-digit' }),
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  }
}

const toDueText = (value?: string | null): string => {
  if (!value) {
    return 'No deadline'
  }

  const dueAt = new Date(value).getTime()
  const diffDays = Math.ceil((dueAt - Date.now()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} days`
  }

  if (diffDays === 0) {
    return 'Due today'
  }

  return `Due in ${diffDays} days`
}

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
      <section className="role-dashboard-page role-dashboard-page-lead">
        <header className="role-dashboard-header">
          <div>
            <p className="role-dashboard-kicker">Recruitment Intelligence</p>
            <h1>Lead Recruiter Overview</h1>
            <p>Strategic oversight for the current hiring cycle.</p>
          </div>
          <div className="role-dashboard-date-chip">Cycle Ends: {toCycleDate(cycleEnds)}</div>
        </header>

        <section className="role-dashboard-kpi-grid role-dashboard-kpi-grid-3">
          <article className="role-dashboard-kpi-card">
            <p>Active Mandates</p>
            <strong>{activeMandatesCount.totalDocs}</strong>
            <span>+{Math.max(Math.round(typedPendingReviews.length / 2), 1)} this week</span>
          </article>
          <article className="role-dashboard-kpi-card">
            <p>Pending Reviews</p>
            <strong>{typedPendingReviews.length}</strong>
            <span>{Math.round(averagePendingReviewHours * 10) / 10}h avg wait</span>
          </article>
          <article className="role-dashboard-kpi-card">
            <p>Approval Rate</p>
            <strong>{approvalRate}%</strong>
            <span>Last 30 days</span>
          </article>
        </section>

        <section className="role-dashboard-main-grid">
          <article className="role-dashboard-card role-dashboard-card-main">
            <div className="role-dashboard-card-head">
              <h2>Pending Candidate Reviews</h2>
              <Link href={APP_ROUTES.internal.applications.reviewQueue}>View Queue</Link>
            </div>
            {typedPendingReviews.length === 0 ? (
              <p className="role-dashboard-empty">No pending submissions. Queue is clear.</p>
            ) : (
              <div className="role-dashboard-list">
                {typedPendingReviews.slice(0, 5).map((application) => (
                  <article className="role-dashboard-list-row" key={application.id}>
                    <span className="role-dashboard-avatar">{toInitials(readLabel(application.candidate, 'CD'))}</span>
                    <div>
                      <p>{readLabel(application.candidate)}</p>
                      <small>
                        {readLabel(application.job)} · Recruiter: {readLabel(application.recruiter)}
                      </small>
                    </div>
                    <span className="role-dashboard-row-meta">{toRelativeTime(application.updatedAt)}</span>
                  </article>
                ))}
              </div>
            )}
          </article>

          <div className="role-dashboard-side-grid">
            <article className="role-dashboard-card">
              <div className="role-dashboard-card-head">
                <h2>Operational Velocity</h2>
                <span>{typedPendingReviews.length} pending</span>
              </div>
              <div className="role-dashboard-velocity">
                {velocitySeries.map((point) => {
                  const heightPercent = Math.max(Math.round((point.count / maxVelocityCount) * 100), 8)
                  return (
                    <div className="role-dashboard-velocity-col" key={point.dayLabel}>
                      <span
                        className={`role-dashboard-velocity-bar ${point.isHighlighted ? 'role-dashboard-velocity-bar-active' : ''}`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      <p>{point.dayLabel}</p>
                    </div>
                  )
                })}
              </div>
            </article>

            <article className="role-dashboard-card">
              <div className="role-dashboard-card-head">
                <h2>Recruiter Performance</h2>
                <span>{approvalRate}% approval</span>
              </div>
              {recruiterPerformance.length === 0 ? (
                <p className="role-dashboard-empty">No recent review decisions yet.</p>
              ) : (
                <div className="role-dashboard-performance-list">
                  {recruiterPerformance.map((row) => (
                    <article className="role-dashboard-performance-row" key={row.name}>
                      <span className="role-dashboard-avatar">{toInitials(row.name)}</span>
                      <div>
                        <p>{row.name}</p>
                        <small>{row.acceptance}% acceptance</small>
                      </div>
                      <div className="role-dashboard-progress">
                        <span style={{ width: `${Math.max(row.acceptance, 8)}%` }} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="role-dashboard-card">
              <h2>Recent Review Actions</h2>
              {typedReviewHistory.length === 0 ? (
                <p className="role-dashboard-empty">No recent actions available.</p>
              ) : (
                <div className="role-dashboard-action-list">
                  {typedReviewHistory.slice(0, 4).map((entry) => (
                    <article className="role-dashboard-action-row" key={entry.id}>
                      <span className={`role-dashboard-action-dot role-dashboard-action-dot-${REVIEW_STAGE_TONE_CLASS[entry.toStage] || 'blue'}`} />
                      <div>
                        <p>
                          {APPLICATION_STAGE_LABELS[entry.toStage]}: {readLabel(entry.candidate)}
                        </p>
                        <small>
                          Recruiter: {readLabel(entry.recruiter)} · {toRelativeTime(entry.changedAt)}
                        </small>
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

  if (user.role === 'recruiter') {
    const [sourcedCandidatesCount, assignedJobs, recruiterApplications] = await Promise.all([
      payload.count({
        collection: 'candidates',
        overrideAccess: false,
        user,
        where: {
          sourcedBy: {
            equals: user.id,
          },
        },
      }),
      payload.find({
        collection: 'jobs',
        depth: 1,
        limit: 24,
        pagination: false,
        overrideAccess: false,
        select: {
          employmentType: true,
          id: true,
          location: true,
          openings: true,
          priority: true,
          status: true,
          targetClosureDate: true,
          title: true,
        },
        sort: '-updatedAt',
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
        limit: 300,
        pagination: false,
        overrideAccess: false,
        select: {
          candidate: true,
          candidateInvitedAt: true,
          id: true,
          job: true,
          latestComment: true,
          stage: true,
          updatedAt: true,
        },
        sort: '-updatedAt',
        user,
      }),
    ])

    const typedJobs = assignedJobs.docs
    const typedApplications = recruiterApplications.docs as Pick<
      Application,
      'candidate' | 'candidateInvitedAt' | 'id' | 'job' | 'latestComment' | 'stage' | 'updatedAt'
    >[]

    const activeApplicationsCount = typedApplications.filter(
      (app) => app.stage !== 'internalReviewRejected',
    ).length
    const placementsCount = typedApplications.filter((app) => app.stage === 'candidateApplied').length
    const sentBackItems = typedApplications
      .filter((app) => app.stage === 'sentBackForCorrection')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 2)
    const invitedCandidates = typedApplications
      .filter((app) => app.stage === 'candidateInvited')
      .sort((a, b) => {
        const aTime = new Date(a.candidateInvitedAt || a.updatedAt).getTime()
        const bTime = new Date(b.candidateInvitedAt || b.updatedAt).getTime()
        return aTime - bTime
      })
      .slice(0, 4)

    const applicationsByJob = new Map<string, typeof typedApplications>()
    typedApplications.forEach((application) => {
      const key =
        application.job && typeof application.job === 'object' && 'id' in application.job
          ? String((application.job as { id: number | string }).id)
          : String(application.job)
      const bucket = applicationsByJob.get(key) || []
      bucket.push(application)
      applicationsByJob.set(key, bucket)
    })

    const topJobCards = typedJobs.slice(0, 3).map((job) => {
      const jobID = String(job.id)
      const jobApplications = applicationsByJob.get(jobID) || []
      const inReviewCount = jobApplications.filter((app) =>
        ['internalReviewPending', 'internalReviewApproved', 'candidateInvited', 'candidateApplied'].includes(app.stage),
      ).length
      const placedCount = jobApplications.filter((app) => app.stage === 'candidateApplied').length
      const progressPercent =
        job.openings > 0 ? Math.min(Math.round((placedCount / job.openings) * 100), 100) : 0
      const candidatePreview = jobApplications.slice(0, 4).map((app) => readLabel(app.candidate, 'CD'))

      return {
        candidatePreview,
        dueText: toDueText(job.targetClosureDate),
        inReviewCount,
        job,
        progressPercent,
      }
    })

    return (
      <section className="role-dashboard-page role-dashboard-page-recruiter">
        <header className="role-dashboard-header">
          <div>
            <p className="role-dashboard-kicker">Recruiter Workspace</p>
            <h1>Recruiter Overview</h1>
            <p>Monitoring your active talent pipelines.</p>
          </div>
          <div className="role-dashboard-header-actions">
            <button className="role-dashboard-chip-btn" type="button">
              This Month
            </button>
            <Link className="role-dashboard-chip-btn" href={APP_ROUTES.internal.applications.list}>
              Export Data
            </Link>
          </div>
        </header>

        <section className="role-dashboard-kpi-grid role-dashboard-kpi-grid-3">
          <article className="role-dashboard-kpi-card">
            <p>Sourced Candidates</p>
            <strong>{sourcedCandidatesCount.totalDocs.toLocaleString('en-US')}</strong>
            <span>+12%</span>
          </article>
          <article className="role-dashboard-kpi-card">
            <p>Active Applications</p>
            <strong>{activeApplicationsCount}</strong>
            <span>0% change</span>
          </article>
          <article className="role-dashboard-kpi-card">
            <p>Placements</p>
            <strong>{placementsCount}</strong>
            <span>+5%</span>
          </article>
        </section>

        <section className="role-dashboard-main-grid">
          <article className="role-dashboard-card role-dashboard-card-main">
            <div className="role-dashboard-card-head">
              <h2>My Assigned Jobs</h2>
              <Link href={APP_ROUTES.internal.jobs.assigned}>View Pipeline</Link>
            </div>
            {topJobCards.length === 0 ? (
              <p className="role-dashboard-empty">No assigned active jobs yet.</p>
            ) : (
              <div className="role-dashboard-job-list">
                {topJobCards.map((item) => (
                  <article className="role-dashboard-job-item" key={item.job.id}>
                    <div className="role-dashboard-job-top">
                      <div>
                        <p>{item.job.title}</p>
                        <small>
                          {item.job.location || 'Location TBD'} · {item.job.employmentType}
                        </small>
                      </div>
                      <span>{item.job.priority.toUpperCase()}</span>
                    </div>
                    <p className="role-dashboard-job-due">{item.dueText}</p>
                    <div className="role-dashboard-progress">
                      <span style={{ width: `${Math.max(item.progressPercent, 4)}%` }} />
                    </div>
                    <div className="role-dashboard-job-meta">
                      <p>{item.inReviewCount} in review</p>
                      <p>{item.progressPercent}% filled</p>
                    </div>
                    <Link href={`${APP_ROUTES.internal.jobs.detailBase}/${item.job.id}`}>Open Job Board</Link>
                  </article>
                ))}
              </div>
            )}
          </article>

          <div className="role-dashboard-side-grid">
            <article className="role-dashboard-card">
              <h2>Action Required</h2>
              {sentBackItems.length === 0 ? (
                <p className="role-dashboard-empty">No returned candidates right now.</p>
              ) : (
                <div className="role-dashboard-action-list">
                  {sentBackItems.map((application) => (
                    <article className="role-dashboard-action-row" key={application.id}>
                      <span className="role-dashboard-action-pill">Returned</span>
                      <p>Candidate: {readLabel(application.candidate)}</p>
                      <small>{application.latestComment || 'Lead requested profile corrections.'}</small>
                      <div className="role-dashboard-inline-actions">
                        <button type="button">Dismiss</button>
                        <Link href={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}>Fix Detail</Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="role-dashboard-card">
              <h2>Upcoming Interviews</h2>
              {invitedCandidates.length === 0 ? (
                <p className="role-dashboard-empty">No interviews scheduled yet.</p>
              ) : (
                <div className="role-dashboard-interview-list">
                  {invitedCandidates.map((application) => {
                    const interviewDate = toMonthDay(application.candidateInvitedAt || application.updatedAt)
                    return (
                      <article className="role-dashboard-interview-row" key={`interview-${application.id}`}>
                        <span>
                          {interviewDate.month}
                          <strong>{interviewDate.day}</strong>
                        </span>
                        <div>
                          <p>{readLabel(application.candidate)}</p>
                          <small>{readLabel(application.job)}</small>
                        </div>
                      </article>
                    )
                  })}
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
    <section className="role-dashboard-page role-dashboard-page-admin">
      <header className="role-dashboard-header">
        <div>
          <p className="role-dashboard-kicker">HR Operational Intelligence</p>
          <h1>Admin Overview</h1>
          <p>Central operations summary across clients, jobs, recruiters, and candidates.</p>
        </div>
        <div className="role-dashboard-date-chip">{dateRangeLabel}</div>
      </header>

      <section className="role-dashboard-kpi-grid role-dashboard-kpi-grid-4">
        <article className="role-dashboard-kpi-card">
          <p>Active Clients</p>
          <strong>{activeClientsCount.totalDocs}</strong>
          <span>+12%</span>
        </article>
        <article className="role-dashboard-kpi-card">
          <p>Open Jobs</p>
          <strong>{openJobsCount.totalDocs}</strong>
          <span>+4%</span>
        </article>
        <article className="role-dashboard-kpi-card">
          <p>Leads Assigned</p>
          <strong>{clientLeadAssignments.totalDocs + jobLeadAssignments.totalDocs}</strong>
          <span>-2%</span>
        </article>
        <article className="role-dashboard-kpi-card">
          <p>Total Candidates</p>
          <strong>{candidateCount.totalDocs.toLocaleString('en-US')}</strong>
          <span>+18%</span>
        </article>
      </section>

      <section className="role-dashboard-main-grid">
        <article className="role-dashboard-card role-dashboard-card-main">
          <div className="role-dashboard-card-head">
            <h2>Recent Activity</h2>
            <Link href={APP_ROUTES.internal.applications.list}>View Logs</Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="role-dashboard-empty">No recent activity.</p>
          ) : (
            <div className="role-dashboard-action-list">
              {recentActivity.map((activity) => (
                <article className="role-dashboard-action-row" key={activity.id}>
                  <span className={`role-dashboard-action-dot role-dashboard-action-dot-${activity.tone}`} />
                  <div>
                    <p>{activity.title}</p>
                    <small>{activity.subtitle}</small>
                  </div>
                  <span className="role-dashboard-row-meta">{activity.time}</span>
                </article>
              ))}
            </div>
          )}

          <div className="role-dashboard-report-box">
            <p>No reports generated for this period.</p>
            <button type="button">Create First Report</button>
          </div>
        </article>

        <div className="role-dashboard-side-grid">
          <article className="role-dashboard-card">
            <h2>Quick Actions</h2>
            <div className="role-dashboard-quick-grid">
              <Link href={APP_ROUTES.internal.clients.list}>Add Client</Link>
              <Link href={APP_ROUTES.internal.assignments.head}>Assign Leads</Link>
              <Link href={`${APP_ROUTES.internal.jobs.assigned}#create-job`}>Post Job</Link>
              <Link href={APP_ROUTES.internal.candidates.new}>Bulk Upload</Link>
            </div>
            <div className="role-dashboard-task-list">
              <p>Pending Tasks</p>
              <div>Verify {Math.max(newCandidatesCount.totalDocs, pendingReviews)} New Candidates</div>
              <div>Client Meeting in 2h</div>
            </div>
          </article>

          <article className="role-dashboard-card">
            <div className="role-dashboard-card-head">
              <h2>Recruiter Load</h2>
              <Link href={APP_ROUTES.internal.assignments.lead}>Manage</Link>
            </div>
            {recruiterLoad.length === 0 ? (
              <p className="role-dashboard-empty">No recruiter assignments yet.</p>
            ) : (
              <div className="role-dashboard-performance-list">
                {recruiterLoad.map((item) => {
                  const percent = Math.max(Math.round((item.count / maxRecruiterLoad) * 100), 10)
                  return (
                    <article className="role-dashboard-performance-row" key={item.name}>
                      <div>
                        <p>{item.name}</p>
                        <small>{percent}% capacity</small>
                      </div>
                      <div className="role-dashboard-progress">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </article>
        </div>
      </section>
    </section>
  )
}
