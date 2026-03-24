import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'
import type { CSSProperties } from 'react'

import { requireInternalUser } from '@/lib/auth/internal-auth'
import type { InternalRole } from '@/lib/constants/roles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as { fullName?: string; name?: string; title?: string; email?: string }
    return typed.fullName || typed.title || typed.name || typed.email || fallback
  }

  return fallback
}

const readID = (value: unknown): string => {
  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  if (value && typeof value === 'object') {
    const typed = value as { id?: number | string }
    if (typed.id !== undefined && typed.id !== null) {
      return String(typed.id)
    }
  }

  return ''
}

const STAGE_ANALYTICS = [
  { key: 'sourcedByRecruiter', label: 'Applied', tone: 'slate' },
  { key: 'internalReviewPending', label: 'Screening', tone: 'orange' },
  { key: 'internalReviewApproved', label: 'Skill Test', tone: 'teal' },
  { key: 'candidateInvited', label: 'Interview', tone: 'purple' },
  { key: 'candidateApplied', label: 'Hired', tone: 'green' },
] as const

const ROLE_ACTIONS: Record<InternalRole, Array<{ href: string; label: string }>> = {
  admin: [
    { href: APP_ROUTES.internal.assignments.head, label: 'Assign Client To Lead' },
    { href: APP_ROUTES.internal.assignments.lead, label: 'Change Recruiter Assignment' },
    { href: APP_ROUTES.internal.jobs.assigned, label: 'Open Jobs Board' },
  ],
  leadRecruiter: [
    { href: APP_ROUTES.internal.jobs.assigned, label: 'Create Or Manage Jobs' },
    { href: APP_ROUTES.internal.assignments.lead, label: 'Change Recruiter Assignment' },
    { href: APP_ROUTES.internal.applications.reviewQueue, label: 'Open Review Queue' },
  ],
  recruiter: [
    { href: APP_ROUTES.internal.jobs.assigned, label: 'Open Assigned Jobs' },
    { href: APP_ROUTES.internal.candidates.new, label: 'Add Candidate' },
    { href: APP_ROUTES.internal.schedule, label: 'Open Schedule' },
  ],
}

const getDayLabel = (value: Date) =>
  value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
  })

export default async function InternalDashboardPage() {
  const user = await requireInternalUser()
  const payload = await getPayload({ config: configPromise })
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const [jobs, applications, candidatesCount, newCandidatesWeekCount] = await Promise.all([
    payload.find({
      collection: 'jobs',
      depth: 1,
      limit: 80,
      pagination: false,
      overrideAccess: false,
      select: {
        client: true,
        id: true,
        openings: true,
        priority: true,
        status: true,
        targetClosureDate: true,
        title: true,
        updatedAt: true,
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
      limit: 220,
      pagination: false,
      overrideAccess: false,
      select: {
        candidate: true,
        id: true,
        job: true,
        latestComment: true,
        recruiter: true,
        stage: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
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
  ])

  const pendingReview = applications.docs.filter(
    (application) => application.stage === 'internalReviewPending',
  ).length
  const invitedThisWeek = applications.docs.filter(
    (application) =>
      application.stage === 'candidateInvited' &&
      new Date(application.updatedAt).getTime() >= weekStart.getTime(),
  ).length
  const hiredCount = applications.docs.filter((application) => application.stage === 'candidateApplied').length
  const upcomingInterviewCount = applications.docs.filter((application) =>
    ['candidateInvited', 'candidateApplied'].includes(application.stage),
  ).length

  const stageCounts = new Map<string, number>()
  STAGE_ANALYTICS.forEach((stage) => stageCounts.set(stage.key, 0))

  applications.docs.forEach((application) => {
    const existing = stageCounts.get(application.stage)
    if (typeof existing === 'number') {
      stageCounts.set(application.stage, existing + 1)
    }
  })

  const maxStageValue = Math.max(...Array.from(stageCounts.values()), 1)

  const recentItems = applications.docs.slice(0, 8)
  const scheduleItems = applications.docs
    .filter((application) =>
      ['internalReviewPending', 'candidateInvited', 'candidateApplied'].includes(application.stage),
    )
    .slice(0, 8)

  const nextWeekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date()
    day.setDate(day.getDate() + index)
    day.setHours(0, 0, 0, 0)
    return day
  })

  const scheduleByDay = nextWeekDays.map((day) => {
    const dayKey = day.toDateString()
    const items = scheduleItems.filter((item) => {
      const itemDay = new Date(item.updatedAt)
      itemDay.setHours(0, 0, 0, 0)
      return itemDay.toDateString() === dayKey
    })

    return {
      day,
      items,
    }
  })

  const jobCardData = jobs.docs.slice(0, 4).map((job) => {
    const jobApplications = applications.docs.filter(
      (application) => readID(application.job) === String(job.id),
    )
    const inReview = jobApplications.filter((application) => application.stage === 'internalReviewPending').length
    const inInterview = jobApplications.filter((application) => application.stage === 'candidateInvited').length
    const offered = jobApplications.filter((application) => application.stage === 'candidateApplied').length
    const sourced = jobApplications.filter((application) => application.stage === 'sourcedByRecruiter').length
    const total = Math.max(jobApplications.length, 1)
    const progressPercent = Math.min(Math.round((offered / total) * 100), 100)

    return {
      id: job.id,
      inInterview,
      inReview,
      offered,
      openings: job.openings,
      progressPercent,
      sourced,
      title: job.title,
    }
  })

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2 recruiter-hero-panel">
        <div>
          <p className="eyebrow">{INTERNAL_ROLE_LABELS[user.role]}</p>
          <h1>Welcome</h1>
          <p className="panel-intro">
            You have <strong>{upcomingInterviewCount}</strong> upcoming interview and follow-up actions this week.
          </p>
        </div>
        <div className="public-actions">
          {ROLE_ACTIONS[user.role].map((action) => (
            <Link className="button button-secondary" href={action.href} key={action.href}>
              {action.label}
            </Link>
          ))}
        </div>
      </article>

      <article className="panel panel-span-2">
        <div className="stat-strip">
          <div className="stat-tile stat-tile-blue">
            <p className="stat-title">Total Candidates</p>
            <p className="stat-value">{candidatesCount.totalDocs}</p>
            <p className="stat-meta">Across visible jobs</p>
          </div>
          <div className="stat-tile stat-tile-purple">
            <p className="stat-title">New Candidates</p>
            <p className="stat-value">{newCandidatesWeekCount.totalDocs}</p>
            <p className="stat-meta">Added in last 7 days</p>
          </div>
          <div className="stat-tile stat-tile-slate">
            <p className="stat-title">Review Pending</p>
            <p className="stat-value">{pendingReview}</p>
            <p className="stat-meta">Need lead decision</p>
          </div>
          <div className="stat-tile stat-tile-green">
            <p className="stat-title">Candidates Hired</p>
            <p className="stat-value">{hiredCount}</p>
            <p className="stat-meta">{invitedThisWeek} invited this week</p>
          </div>
        </div>
      </article>

      <article className="panel panel-span-2 recruiter-dashboard-main">
        <div className="recruiter-analysis-panel">
          <div className="recruiter-analysis-heading">
            <div>
              <h2>Job Analysis</h2>
              <p className="panel-subtitle">Live stage movement in your visible application pipeline.</p>
            </div>
            <span className="status-chip">Weekly</span>
          </div>
          <div className="recruiter-analysis-chart">
            {STAGE_ANALYTICS.map((item) => {
              const value = stageCounts.get(item.key) || 0
              return (
                <div className="recruiter-analysis-row" key={item.key}>
                  <p className="recruiter-analysis-label">{item.label}</p>
                  <div className="recruiter-analysis-track">
                    <span
                      className={`recruiter-analysis-fill recruiter-analysis-fill-${item.tone}`}
                      style={{ width: `${Math.max((value / maxStageValue) * 100, value > 0 ? 10 : 0)}%` }}
                    />
                  </div>
                  <p className="recruiter-analysis-value">{value}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="recruiter-schedule-widget">
          <div className="recruiter-schedule-heading">
            <h2>Schedule</h2>
            <Link className="admin-link" href={APP_ROUTES.internal.schedule}>
              View All
            </Link>
          </div>
          <div className="recruiter-schedule-days">
            {scheduleByDay.map((entry) => (
              <article className="recruiter-schedule-day" key={entry.day.toISOString()}>
                <p className="recruiter-schedule-day-label">{getDayLabel(entry.day)}</p>
                {entry.items.length === 0 ? (
                  <p className="board-empty">No items</p>
                ) : (
                  entry.items.slice(0, 2).map((item) => (
                    <div className="recruiter-schedule-item" key={`dash-cal-${entry.day.toISOString()}-${item.id}`}>
                      <p className="schedule-title">{readLabel(item.candidate)}</p>
                      <p className="schedule-meta">{readLabel(item.job)}</p>
                    </div>
                  ))
                )}
              </article>
            ))}
          </div>
        </div>
      </article>

      <article className="panel">
        <div className="recruiter-card-header">
          <h2>Job Spotlight</h2>
          <Link className="admin-link" href={APP_ROUTES.internal.jobs.assigned}>
            View Jobs
          </Link>
        </div>
        <div className="recruiter-job-cards">
          {jobCardData.length === 0 ? (
            <p className="board-empty">No active jobs in your visibility scope.</p>
          ) : (
            jobCardData.map((item) => (
              <article className="recruiter-job-card" key={`dash-job-${item.id}`}>
                <p className="recruiter-job-title">{item.title}</p>
                <div
                  className="recruiter-job-ring"
                  style={
                    {
                      '--ring-progress': `${item.progressPercent}%`,
                    } as CSSProperties
                  }
                >
                  <span>{item.openings} openings</span>
                </div>
                <div className="recruiter-job-breakdown">
                  <p>Review: {item.inReview}</p>
                  <p>Interview: {item.inInterview}</p>
                  <p>Hired: {item.offered}</p>
                  <p>Sourced: {item.sourced}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </article>

      <article className="panel">
        <div className="recruiter-card-header">
          <h2>Recently Applied</h2>
          <Link className="admin-link" href={APP_ROUTES.internal.applications.list}>
            View All
          </Link>
        </div>
        <div className="activity-list">
          {recentItems.length === 0 ? (
            <p className="board-empty">No recent application activity.</p>
          ) : (
            recentItems.map((item) => (
              <article className="activity-item" key={`recent-${item.id}`}>
                <p className="activity-name">{readLabel(item.candidate)}</p>
                <p className="activity-meta">
                  Applied for <strong>{readLabel(item.job)}</strong>
                </p>
                <p className="activity-time">{new Date(item.updatedAt).toLocaleString('en-IN')}</p>
              </article>
            ))
          )}
        </div>
      </article>
    </section>
  )
}
