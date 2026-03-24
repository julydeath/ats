import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as { fullName?: string; title?: string; name?: string; email?: string }
    return typed.fullName || typed.title || typed.name || typed.email || fallback
  }

  return fallback
}

const startOfDay = (date: Date) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const addDays = (date: Date, days: number) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const toDayLabel = (date: Date) =>
  date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
  })

export default async function InternalSchedulePage() {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const canOpenReviewQueue = user.role === 'admin' || user.role === 'leadRecruiter'

  const today = startOfDay(new Date())
  const sevenDaysLater = addDays(today, 7)
  const nextWeekDays = Array.from({ length: 7 }, (_, index) => addDays(today, index))

  const [upcomingApplications, jobClosures] = await Promise.all([
    payload.find({
      collection: 'applications',
      depth: 1,
      limit: 120,
      pagination: false,
      overrideAccess: false,
      select: {
        candidate: true,
        id: true,
        job: true,
        recruiter: true,
        stage: true,
        updatedAt: true,
      },
      sort: 'updatedAt',
      user,
      where: {
        stage: {
          in: ['internalReviewPending', 'candidateInvited', 'candidateApplied'],
        },
      },
    }),
    payload.find({
      collection: 'jobs',
      depth: 1,
      limit: 80,
      pagination: false,
      overrideAccess: false,
      select: {
        client: true,
        id: true,
        priority: true,
        targetClosureDate: true,
        title: true,
      },
      sort: 'targetClosureDate',
      user,
      where: {
        and: [
          {
            status: {
              in: ['active', 'onHold'],
            },
          },
          {
            targetClosureDate: {
              greater_than_equal: today.toISOString(),
            },
          },
          {
            targetClosureDate: {
              less_than_equal: sevenDaysLater.toISOString(),
            },
          },
        ],
      },
    }),
  ])

  const stageBuckets = {
    pending: upcomingApplications.docs.filter((application) => application.stage === 'internalReviewPending'),
    invited: upcomingApplications.docs.filter((application) => application.stage === 'candidateInvited'),
    applied: upcomingApplications.docs.filter((application) => application.stage === 'candidateApplied'),
  }

  const daySchedule = nextWeekDays.map((day) => {
    const dayKey = day.toDateString()
    const applications = upcomingApplications.docs.filter((application) => {
      const activityDay = startOfDay(new Date(application.updatedAt))
      return activityDay.toDateString() === dayKey
    })
    const closures = jobClosures.docs.filter((job) => {
      if (!job.targetClosureDate) {
        return false
      }

      const closureDay = startOfDay(new Date(job.targetClosureDate))
      return closureDay.toDateString() === dayKey
    })

    return { applications, closures, day }
  })

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2 recruiter-hero-panel">
        <div>
          <p className="eyebrow">Schedule</p>
          <h1>Recruitment Calendar</h1>
          <p className="panel-intro">
            {INTERNAL_ROLE_LABELS[user.role]} schedule view for upcoming reviews, candidate actions, and job
            closure targets.
          </p>
        </div>
        <div className="public-actions">
          <Link className="button button-secondary" href={APP_ROUTES.internal.jobs.assigned}>
            Open Jobs
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.internal.applications.list}>
            Open Applications
          </Link>
          {canOpenReviewQueue ? (
            <Link className="button button-secondary" href={APP_ROUTES.internal.applications.reviewQueue}>
              Open Review Queue
            </Link>
          ) : null}
        </div>
      </article>

      <article className="panel panel-span-2">
        <div className="stat-strip">
          <div className="stat-tile stat-tile-slate">
            <p className="stat-title">Pending Internal Review</p>
            <p className="stat-value">{stageBuckets.pending.length}</p>
            <p className="stat-meta">Awaiting lead recruiter action</p>
          </div>
          <div className="stat-tile stat-tile-purple">
            <p className="stat-title">Candidates Invited</p>
            <p className="stat-value">{stageBuckets.invited.length}</p>
            <p className="stat-meta">Application portal shared</p>
          </div>
          <div className="stat-tile stat-tile-green">
            <p className="stat-title">Candidates Applied</p>
            <p className="stat-value">{stageBuckets.applied.length}</p>
            <p className="stat-meta">Ready for next process step</p>
          </div>
          <div className="stat-tile stat-tile-blue">
            <p className="stat-title">Job Closures in 7 Days</p>
            <p className="stat-value">{jobClosures.docs.length}</p>
            <p className="stat-meta">Active and on-hold jobs</p>
          </div>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Next 7 Days</h2>
        <div className="calendar-grid recruiter-calendar-grid">
          {daySchedule.map((entry) => (
            <article className="calendar-day recruiter-calendar-day" key={entry.day.toISOString()}>
              <p className="calendar-day-label">{toDayLabel(entry.day)}</p>
              {entry.applications.slice(0, 3).map((application) => (
                <div className="calendar-item" key={`cal-app-${entry.day.toISOString()}-${application.id}`}>
                  <p className="calendar-item-title">{readLabel(application.candidate)}</p>
                  <p className="calendar-item-meta">
                    {APPLICATION_STAGE_LABELS[application.stage as ApplicationStage]}
                  </p>
                </div>
              ))}

              {entry.closures.slice(0, 2).map((job) => (
                <div className="calendar-item calendar-item-closure" key={`cal-job-${entry.day.toISOString()}-${job.id}`}>
                  <p className="calendar-item-title">{job.title}</p>
                  <p className="calendar-item-meta">Closure target</p>
                </div>
              ))}

              {entry.applications.length === 0 && entry.closures.length === 0 ? (
                <p className="board-empty">No tasks</p>
              ) : null}
            </article>
          ))}
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Upcoming Activity</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job</th>
                <th>Stage</th>
                <th>Recruiter</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingApplications.docs.length === 0 ? (
                <tr>
                  <td colSpan={6}>No schedule activity in your visibility scope.</td>
                </tr>
              ) : (
                upcomingApplications.docs.map((application) => (
                  <tr key={`schedule-row-${application.id}`}>
                    <td>{readLabel(application.candidate)}</td>
                    <td>{readLabel(application.job)}</td>
                    <td>{APPLICATION_STAGE_LABELS[application.stage as ApplicationStage]}</td>
                    <td>{readLabel(application.recruiter)}</td>
                    <td>{new Date(application.updatedAt).toLocaleString('en-IN')}</td>
                    <td>
                      <Link
                        className="button button-secondary"
                        href={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
