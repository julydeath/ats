import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import {
  INTERVIEW_MODE_OPTIONS,
  INTERVIEW_ROUND_OPTIONS,
  INTERVIEW_STATUS_OPTIONS,
} from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

const PAGE_SIZE = 12

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
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
  })
}

const buildQuery = ({
  page,
  q,
  status,
}: {
  page: number
  q: string
  status: string
}): string => {
  const params = new URLSearchParams()

  if (q) {
    params.set('q', q)
  }

  if (status) {
    params.set('status', status)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

type InterviewsPageProps = {
  searchParams?: Promise<{
    create?: string
    error?: string
    page?: string
    q?: string
    status?: string
    success?: string
  }>
}

export default async function InterviewsPage({ searchParams }: InterviewsPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}

  const canManageInterviews = user.role === 'admin' || user.role === 'leadRecruiter' || user.role === 'recruiter'
  const search = String(resolvedSearchParams.q || '').trim().toLowerCase()
  const statusFilter = String(resolvedSearchParams.status || '').trim()
  const page = Math.max(Number.parseInt(String(resolvedSearchParams.page || '1'), 10) || 1, 1)
  const isCreateOpen = resolvedSearchParams.create === '1'

  const [interviewsResult, eligibleApplications] = await Promise.all([
    payload.find({
      collection: 'interviews',
      depth: 1,
      limit: PAGE_SIZE,
      overrideAccess: false,
      page,
      select: {
        application: true,
        candidate: true,
        endTime: true,
        id: true,
        interviewCode: true,
        interviewRound: true,
        interviewerName: true,
        job: true,
        mode: true,
        startTime: true,
        status: true,
      },
      sort: '-startTime',
      user,
      where: {
        and: [
          ...(statusFilter
            ? [
                {
                  status: {
                    equals: statusFilter,
                  },
                },
              ]
            : []),
          ...(search
            ? [
                {
                  or: [
                    {
                      interviewCode: {
                        contains: search,
                      },
                    },
                    {
                      interviewerName: {
                        contains: search,
                      },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    }),
    canManageInterviews
      ? payload.find({
          collection: 'applications',
          depth: 1,
          limit: 180,
          overrideAccess: false,
          pagination: false,
          select: {
            applicationCode: true,
            candidate: true,
            id: true,
            job: true,
            stage: true,
          },
          sort: '-updatedAt',
          user,
          where: {
            stage: {
              in: ['submittedToClient', 'interviewScheduled', 'interviewCleared'],
            },
          },
        })
      : Promise.resolve({ docs: [] as Array<{ applicationCode?: string; candidate?: unknown; id: number | string; job?: unknown; stage?: string }> }),
  ])

  const currentPage = interviewsResult.page || 1
  const totalPages = Math.max(interviewsResult.totalPages || 1, 1)

  return (
    <section className="schedule-workspace-page">
      <header className="schedule-workspace-header">
        <div>
          <p className="schedule-workspace-breadcrumb">Workspace &gt; Interviews</p>
          <h1>Interview Schedules</h1>
          <p>Plan rounds, track interview status, and keep timeline data accurate for each application.</p>
        </div>
        <div className="schedule-workspace-header-actions">
          <form className="schedule-workspace-search" method="get">
            <input defaultValue={resolvedSearchParams.q || ''} name="q" placeholder="Search interview code or interviewer" type="search" />
            <select defaultValue={statusFilter} name="status">
              <option value="">All Status</option>
              {INTERVIEW_STATUS_OPTIONS.map((option) => (
                <option key={`interview-status-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="submit">Filter</button>
          </form>
          {canManageInterviews ? (
            <Link className="schedule-workspace-main-action" href={`${APP_ROUTES.internal.interviews.list}?create=1`}>
              + Schedule Interview
            </Link>
          ) : null}
        </div>
      </header>

      {resolvedSearchParams.success ? (
        <p className="schedule-workspace-feedback schedule-workspace-feedback-success">Interview schedule updated successfully.</p>
      ) : null}
      {resolvedSearchParams.error ? (
        <p className="schedule-workspace-feedback schedule-workspace-feedback-error">{resolvedSearchParams.error}</p>
      ) : null}

      <article className="schedule-workspace-table-card">
        <table className="schedule-workspace-table">
          <thead>
            <tr>
              <th>Interview</th>
              <th>Candidate / Job</th>
              <th>Round</th>
              <th>Interviewer</th>
              <th>Time Slot</th>
              <th>Status</th>
              {canManageInterviews ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {interviewsResult.docs.length === 0 ? (
              <tr>
                <td className="schedule-workspace-empty" colSpan={canManageInterviews ? 7 : 6}>
                  No interviews found.
                </td>
              </tr>
            ) : (
              interviewsResult.docs.map((interview) => (
                <tr key={`interview-${interview.id}`}>
                  <td>
                    <div className="schedule-workspace-cell-title">
                      <strong>{interview.interviewCode || `INT-${interview.id}`}</strong>
                      <small>{readLabel(interview.application)}</small>
                    </div>
                  </td>
                  <td>
                    <div className="schedule-workspace-cell-meta">
                      <span>{readLabel(interview.candidate)}</span>
                      <small>{readLabel(interview.job)}</small>
                    </div>
                  </td>
                  <td>{String(interview.interviewRound || 'screening')}</td>
                  <td>
                    <div className="schedule-workspace-cell-meta">
                      <span>{interview.interviewerName || 'Not set'}</span>
                      <small>{String(interview.mode || 'video')}</small>
                    </div>
                  </td>
                  <td>
                    {formatDateTime(interview.startTime)}
                    <br />
                    <small>{formatDateTime(interview.endTime)}</small>
                  </td>
                  <td>
                    <span className={`schedule-workspace-status schedule-workspace-status-${String(interview.status || 'scheduled')}`}>
                      {String(interview.status || 'scheduled')}
                    </span>
                  </td>
                  {canManageInterviews ? (
                    <td>
                      <form action={APP_ROUTES.internal.interviews.updateStatus} className="schedule-workspace-inline-form" method="post">
                        <input name="interviewId" type="hidden" value={String(interview.id)} />
                        <select defaultValue={String(interview.status || 'scheduled')} name="status">
                          {INTERVIEW_STATUS_OPTIONS.map((option) => (
                            <option key={`inline-${interview.id}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button type="submit">Update</button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <footer className="schedule-workspace-pagination">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div>
            <Link
              className={currentPage <= 1 ? 'schedule-workspace-page-btn schedule-workspace-page-btn-disabled' : 'schedule-workspace-page-btn'}
              href={`${APP_ROUTES.internal.interviews.list}${buildQuery({ page: Math.max(currentPage - 1, 1), q: String(resolvedSearchParams.q || ''), status: statusFilter })}`}
            >
              Prev
            </Link>
            <Link
              className={currentPage >= totalPages ? 'schedule-workspace-page-btn schedule-workspace-page-btn-disabled' : 'schedule-workspace-page-btn'}
              href={`${APP_ROUTES.internal.interviews.list}${buildQuery({ page: Math.min(currentPage + 1, totalPages), q: String(resolvedSearchParams.q || ''), status: statusFilter })}`}
            >
              Next
            </Link>
          </div>
        </footer>
      </article>

      {canManageInterviews && isCreateOpen ? (
        <div className="schedule-workspace-modal-wrap">
          <div className="schedule-workspace-modal-backdrop" />
          <div className="schedule-workspace-modal">
            <header>
              <h2>Schedule Interview</h2>
              <Link href={APP_ROUTES.internal.interviews.list}>×</Link>
            </header>
            <form action={APP_ROUTES.internal.interviews.create} method="post">
              <div className="schedule-workspace-modal-grid">
                <label className="schedule-workspace-modal-span-2">
                  <span>Application *</span>
                  <select name="application" required>
                    <option value="">Select eligible application</option>
                    {eligibleApplications.docs.map((application) => (
                      <option key={`eligible-app-${application.id}`} value={String(application.id)}>
                        {(application.applicationCode || `APP-${application.id}`)} | {readLabel(application.candidate)} | {readLabel(application.job)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Round *</span>
                  <select defaultValue="screening" name="interviewRound" required>
                    {INTERVIEW_ROUND_OPTIONS.map((option) => (
                      <option key={`round-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Mode *</span>
                  <select defaultValue="video" name="mode" required>
                    {INTERVIEW_MODE_OPTIONS.map((option) => (
                      <option key={`mode-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Interviewer Name *</span>
                  <input name="interviewerName" required type="text" />
                </label>
                <label>
                  <span>Interviewer Email</span>
                  <input name="interviewerEmail" type="email" />
                </label>
                <label>
                  <span>Client POC</span>
                  <input name="clientPOC" type="text" />
                </label>
                <label>
                  <span>Interview Template</span>
                  <input name="interviewTemplate" type="text" />
                </label>
                <label>
                  <span>Start Time *</span>
                  <input name="startTime" required type="datetime-local" />
                </label>
                <label>
                  <span>End Time *</span>
                  <input name="endTime" required type="datetime-local" />
                </label>
                <label>
                  <span>Timezone</span>
                  <input defaultValue="Asia/Kolkata" name="timezone" type="text" />
                </label>
                <label>
                  <span>Meeting Link</span>
                  <input name="meetingLink" placeholder="Google Meet / Teams / Zoom" type="url" />
                </label>
                <label>
                  <span>Location</span>
                  <input name="location" type="text" />
                </label>
                <label>
                  <span>Status *</span>
                  <select defaultValue="scheduled" name="status" required>
                    {INTERVIEW_STATUS_OPTIONS.map((option) => (
                      <option key={`create-status-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="schedule-workspace-modal-span-2">
                  <span>Notes</span>
                  <textarea name="notes" rows={3} />
                </label>
              </div>

              <footer>
                <Link href={APP_ROUTES.internal.interviews.list}>Cancel</Link>
                <button type="submit">Save Interview</button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
