import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { INTERVIEW_STATUS_LABELS, type InterviewStatus } from '@/lib/constants/recruitment'
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

const statusChipClass = (status: InterviewStatus): string => {
  if (status === 'completed') {
    return 'schedule-workspace-chip-good'
  }

  if (status === 'scheduled' || status === 'rescheduled') {
    return 'schedule-workspace-chip-blue'
  }

  if (status === 'cancelled' || status === 'noShow') {
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

  const interviewsResult = await payload.find({
    collection: 'interviews',
    depth: 1,
    limit: 350,
    pagination: false,
    overrideAccess: false,
      select: {
        candidate: true,
        endTime: true,
        id: true,
        interviewCode: true,
        interviewerName: true,
        job: true,
        meetingLink: true,
        recruiter: true,
        startTime: true,
        status: true,
        updatedAt: true,
      },
    sort: 'startTime',
    user,
  })

  const filteredEvents = interviewsResult.docs.filter((event) => {
    const recruiterID = String(extractRelationshipID(event.recruiter) || '')
    const jobID = String(extractRelationshipID(event.job) || '')
    const haystack = [
      event.interviewCode || '',
      event.interviewerName || '',
      readLabel(event.candidate),
      readLabel(event.job),
      readLabel(event.recruiter),
      INTERVIEW_STATUS_LABELS[event.status as InterviewStatus] || String(event.status || ''),
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
      interviewsResult.docs.map((event) => [String(extractRelationshipID(event.recruiter) || ''), readLabel(event.recruiter)]),
    ).entries(),
  )
    .filter(([id]) => id.length > 0)
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const jobOptions = Array.from(
    new Map(
      interviewsResult.docs.map((event) => [String(extractRelationshipID(event.job) || ''), readLabel(event.job)]),
    ).entries(),
  )
    .filter(([id]) => id.length > 0)
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const eventsByDay = new Map<string, typeof filteredEvents>()
  filteredEvents.forEach((event) => {
    const key = dateKey(new Date(event.startTime))
    const list = eventsByDay.get(key) || []
    list.push(event)
    eventsByDay.set(key, list)
  })

  const sortedFutureEvents = filteredEvents
    .filter((event) => new Date(event.startTime).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const nextUp = sortedFutureEvents[0] || filteredEvents[0] || null
  const todayKey = dateKey(today)
  const tomorrow = addDays(today, 1)
  const tomorrowKey = dateKey(tomorrow)
  const laterToday = (eventsByDay.get(todayKey) || []).slice(0, 5)
  const tomorrowEvents = eventsByDay.get(tomorrowKey) || []

  const weekStart = addDays(today, -((today.getDay() + 6) % 7))
  const weekEnd = addDays(weekStart, 7)
  const weekLoad = filteredEvents.filter((event) => {
    const eventDate = new Date(event.startTime)
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
        <Link className="schedule-workspace-main-action" href={`${APP_ROUTES.internal.interviews.list}?create=1`}>
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
                            className={`schedule-workspace-event ${statusChipClass(event.status as InterviewStatus)}`}
                            href={APP_ROUTES.internal.interviews.list}
                            key={`event-${event.id}-${dayKey}`}
                          >
                            <strong>{readLabel(event.candidate)}</strong>
                            <small>{timeLabel(event.startTime)}</small>
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
                          {readLabel(event.job)} · {event.interviewerName || readLabel(event.recruiter)}
                        </small>
                      </div>
                      <div>
                        <span>{INTERVIEW_STATUS_LABELS[event.status as InterviewStatus] || String(event.status)}</span>
                        <small>{dateLabel(event.startTime)}</small>
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
                <small>{timeLabel(nextUp.startTime)}</small>
                <a href={nextUp.meetingLink || '#'} rel="noreferrer" target="_blank">
                  Join Meeting
                </a>
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
                      {INTERVIEW_STATUS_LABELS[event.status as InterviewStatus]} · {timeLabel(event.startTime)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="schedule-workspace-side-card">
            <h3>Tomorrow</h3>
            <p>{tomorrowEvents.length} interviews scheduled</p>
            <small>{dateLabel(tomorrow)}</small>
          </article>

          <article className="schedule-workspace-side-card schedule-workspace-capacity-card">
            <h3>Your Capacity</h3>
            <p>{capacityPercent}% full this week</p>
            <div className="schedule-workspace-capacity-track">
              <span style={{ width: `${capacityPercent}%` }} />
            </div>
          </article>
        </aside>
      </div>
    </section>
  )
}
