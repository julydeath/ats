import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const CALENDAR_PAGE_SIZE = 42

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

const dateKey = (date: Date) => startOfDay(date).toISOString().slice(0, 10)

const monthLabel = (date: Date) =>
  date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

const timeLabel = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Time unknown'
  }

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const dateLabel = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

const stageChipClass = (stage: ApplicationStage): string => {
  if (stage === 'internalReviewApproved' || stage === 'candidateApplied') {
    return 'schedule-workspace-chip-good'
  }

  if (stage === 'candidateInvited') {
    return 'schedule-workspace-chip-blue'
  }

  if (stage === 'internalReviewPending') {
    return 'schedule-workspace-chip-orange'
  }

  return 'schedule-workspace-chip-neutral'
}

const buildQuery = ({
  interviewer,
  job,
  q,
  view,
}: {
  interviewer: string
  job: string
  q: string
  view: string
}): string => {
  const params = new URLSearchParams()

  if (q) {
    params.set('q', q)
  }
  if (interviewer) {
    params.set('interviewer', interviewer)
  }
  if (job) {
    params.set('job', job)
  }
  if (view) {
    params.set('view', view)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

type InternalSchedulePageProps = {
  searchParams?: Promise<{
    interviewer?: string
    job?: string
    q?: string
    view?: string
  }>
}

export default async function InternalSchedulePage({ searchParams }: InternalSchedulePageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchTerm = (resolvedSearchParams.q || '').trim().toLowerCase()
  const interviewerFilter = (resolvedSearchParams.interviewer || '').trim()
  const jobFilter = (resolvedSearchParams.job || '').trim()
  const viewMode = (resolvedSearchParams.view || 'calendar').toLowerCase() === 'upcoming' ? 'upcoming' : 'calendar'

  const today = startOfDay(new Date())
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthStartDay = (firstOfMonth.getDay() + 6) % 7
  const calendarStart = addDays(firstOfMonth, -monthStartDay)
  const calendarDays = Array.from({ length: CALENDAR_PAGE_SIZE }, (_, index) => addDays(calendarStart, index))

  const applicationsResult = await payload.find({
    collection: 'applications',
    depth: 1,
    limit: 300,
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
        in: ['internalReviewPending', 'internalReviewApproved', 'candidateInvited', 'candidateApplied'],
      },
    },
  })

  const filteredEvents = applicationsResult.docs.filter((application) => {
    const recruiterID = String(extractRelationshipID(application.recruiter) || '')
    const jobID = String(extractRelationshipID(application.job) || '')
    const haystack = [
      readLabel(application.candidate),
      readLabel(application.job),
      readLabel(application.recruiter),
      APPLICATION_STAGE_LABELS[application.stage as ApplicationStage] || application.stage,
    ]
      .join(' ')
      .toLowerCase()

    if (searchTerm && !haystack.includes(searchTerm)) {
      return false
    }

    if (interviewerFilter && recruiterID !== interviewerFilter) {
      return false
    }

    if (jobFilter && jobID !== jobFilter) {
      return false
    }

    return true
  })

  const interviewerOptions = Array.from(
    new Map(
      applicationsResult.docs.map((application) => [
        String(extractRelationshipID(application.recruiter) || ''),
        readLabel(application.recruiter),
      ]),
    ).entries(),
  )
    .filter(([id]) => id.length > 0)
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const jobOptions = Array.from(
    new Map(
      applicationsResult.docs.map((application) => [
        String(extractRelationshipID(application.job) || ''),
        readLabel(application.job),
      ]),
    ).entries(),
  )
    .filter(([id]) => id.length > 0)
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const eventsByDay = new Map<string, typeof filteredEvents>()
  filteredEvents.forEach((event) => {
    const key = dateKey(new Date(event.updatedAt))
    const list = eventsByDay.get(key) || []
    list.push(event)
    eventsByDay.set(key, list)
  })

  const sortedFutureEvents = filteredEvents
    .filter((event) => new Date(event.updatedAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())

  const nextUp = sortedFutureEvents[0] || filteredEvents[0] || null
  const todayKey = dateKey(today)
  const tomorrow = addDays(today, 1)
  const tomorrowKey = dateKey(tomorrow)
  const laterToday = (eventsByDay.get(todayKey) || []).slice(0, 5)
  const tomorrowEvents = eventsByDay.get(tomorrowKey) || []

  const weekStart = addDays(today, -((today.getDay() + 6) % 7))
  const weekEnd = addDays(weekStart, 7)
  const weekLoad = filteredEvents.filter((event) => {
    const eventDate = new Date(event.updatedAt)
    return eventDate >= weekStart && eventDate < weekEnd
  }).length
  const capacityPercent = Math.min(100, Math.round((weekLoad / 10) * 100))

  return (
    <section className="schedule-workspace-page">
      <header className="schedule-workspace-header">
        <div>
          <p className="schedule-workspace-breadcrumb">Workspace &gt; Schedule</p>
          <h1>Schedule</h1>
        </div>
        <Link className="schedule-workspace-main-action" href={APP_ROUTES.internal.applications.list}>
          Schedule Interview
        </Link>
      </header>

      <section className="schedule-workspace-toolbar">
        <div className="schedule-workspace-view-switch">
          <Link
            className={`schedule-workspace-view-btn ${viewMode === 'calendar' ? 'schedule-workspace-view-btn-active' : ''}`}
            href={`${APP_ROUTES.internal.schedule}${buildQuery({
              interviewer: interviewerFilter,
              job: jobFilter,
              q: searchTerm,
              view: 'calendar',
            })}`}
          >
            Calendar View
          </Link>
          <Link
            className={`schedule-workspace-view-btn ${viewMode === 'upcoming' ? 'schedule-workspace-view-btn-active' : ''}`}
            href={`${APP_ROUTES.internal.schedule}${buildQuery({
              interviewer: interviewerFilter,
              job: jobFilter,
              q: searchTerm,
              view: 'upcoming',
            })}`}
          >
            Upcoming Sessions
          </Link>
        </div>

        <form className="schedule-workspace-filter-row" method="get">
          <input name="view" type="hidden" value={viewMode} />
          <input
            className="schedule-workspace-search"
            defaultValue={resolvedSearchParams.q || ''}
            name="q"
            placeholder="Search candidates"
            type="search"
          />
          <select className="schedule-workspace-select" defaultValue={interviewerFilter} name="interviewer">
            <option value="">All Interviewers</option>
            {interviewerOptions.map((option) => (
              <option key={`interviewer-${option.id}`} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="schedule-workspace-select" defaultValue={jobFilter} name="job">
            <option value="">All Jobs</option>
            {jobOptions.map((option) => (
              <option key={`job-${option.id}`} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="schedule-workspace-filter-btn" type="submit">
            Filter
          </button>
        </form>
      </section>

      <div className="schedule-workspace-grid">
        <div className="schedule-workspace-main">
          {viewMode === 'calendar' ? (
            <section className="schedule-workspace-calendar-card">
              <div className="schedule-workspace-calendar-head">
                <h2>{monthLabel(today)}</h2>
                <p>{filteredEvents.length} sessions in current filter</p>
              </div>
              <div className="schedule-workspace-weekdays">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="schedule-workspace-calendar-grid">
                {calendarDays.map((day) => {
                  const dayKey = dateKey(day)
                  const events = (eventsByDay.get(dayKey) || []).slice(0, 3)
                  const isToday = dayKey === todayKey
                  const isOutsideMonth = day.getMonth() !== today.getMonth()

                  return (
                    <article
                      className={`schedule-workspace-day ${isToday ? 'schedule-workspace-day-today' : ''} ${
                        isOutsideMonth ? 'schedule-workspace-day-muted' : ''
                      }`}
                      key={dayKey}
                    >
                      <p className="schedule-workspace-day-number">{day.getDate()}</p>
                      <div className="schedule-workspace-day-events">
                        {events.map((event) => (
                          <Link
                            className={`schedule-workspace-event ${stageChipClass(event.stage as ApplicationStage)}`}
                            href={`${APP_ROUTES.internal.applications.detailBase}/${event.id}`}
                            key={`event-${event.id}-${dayKey}`}
                          >
                            <strong>{readLabel(event.candidate)}</strong>
                            <small>{timeLabel(event.updatedAt)}</small>
                          </Link>
                        ))}
                        {events.length === 0 ? <span className="schedule-workspace-empty-slot" /> : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : (
            <section className="schedule-workspace-upcoming-card">
              <h2>Upcoming Sessions</h2>
              {filteredEvents.length === 0 ? (
                <p className="schedule-workspace-empty">No upcoming sessions in this view.</p>
              ) : (
                <div className="schedule-workspace-upcoming-list">
                  {filteredEvents.slice(0, 24).map((event) => (
                    <article className="schedule-workspace-upcoming-item" key={`upcoming-${event.id}`}>
                      <div>
                        <p>{readLabel(event.candidate)}</p>
                        <small>
                          {readLabel(event.job)} · {readLabel(event.recruiter)}
                        </small>
                      </div>
                      <div>
                        <span>{APPLICATION_STAGE_LABELS[event.stage as ApplicationStage]}</span>
                        <small>{dateLabel(event.updatedAt)}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="schedule-workspace-side">
          <article className="schedule-workspace-side-card">
            <div className="schedule-workspace-side-head">
              <h3>Next Up</h3>
              <span>Live</span>
            </div>
            {nextUp ? (
              <div className="schedule-workspace-next-item">
                <p>{readLabel(nextUp.candidate)}</p>
                <small>{readLabel(nextUp.job)}</small>
                <small>{timeLabel(nextUp.updatedAt)}</small>
                <Link href={`${APP_ROUTES.internal.applications.detailBase}/${nextUp.id}`}>Join Meeting</Link>
              </div>
            ) : (
              <p className="schedule-workspace-empty">No next session planned.</p>
            )}
          </article>

          <article className="schedule-workspace-side-card">
            <h3>Later Today</h3>
            <div className="schedule-workspace-bullet-list">
              {laterToday.length === 0 ? (
                <p className="schedule-workspace-empty">No remaining interviews today.</p>
              ) : (
                laterToday.map((event) => (
                  <div key={`later-${event.id}`}>
                    <strong>{readLabel(event.candidate)}</strong>
                    <span>
                      {APPLICATION_STAGE_LABELS[event.stage as ApplicationStage]} · {timeLabel(event.updatedAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="schedule-workspace-side-card">
            <h3>Tomorrow</h3>
            <p className="schedule-workspace-tomorrow-count">{tomorrowEvents.length} interviews scheduled</p>
            <Link href={`${APP_ROUTES.internal.schedule}?view=upcoming`}>See tomorrow&apos;s agenda</Link>
          </article>

          <article className="schedule-workspace-capacity-card">
            <p>Your Capacity</p>
            <strong>{capacityPercent}% Full this week</strong>
            <div>
              <span style={{ width: `${capacityPercent}%` }} />
            </div>
            <small>{weekLoad} planned sessions in current week</small>
          </article>
        </aside>
      </div>
    </section>
  )
}
