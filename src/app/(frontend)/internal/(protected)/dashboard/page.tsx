import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalUser } from '@/lib/auth/internal-auth'
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

export default async function InternalDashboardPage() {
  const user = await requireInternalUser()
  const payload = await getPayload({ config: configPromise })

  if (user.role !== 'admin') {
    return (
      <section className="ops-placeholder-page">
        <article className="ops-card">
          <p className="ops-kicker">Dashboard</p>
          <h1>Role Dashboard In Progress</h1>
          <p>
            Admin dashboard is now rebuilt. Lead Recruiter and Recruiter dashboards will be updated to your new design
            in the next steps.
          </p>
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

  const [activeClientsCount, openJobsCount, candidateCount, newCandidatesCount, applications, recruiterAssignments, clientLeadAssignments, jobLeadAssignments] =
    await Promise.all([
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
              <div className="admin-task">
                Client Meeting in 2h
              </div>
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
