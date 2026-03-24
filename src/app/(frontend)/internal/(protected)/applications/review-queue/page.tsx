import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const PAGE_SIZE = 8

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'number' || typeof value === 'string') {
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

const getInitials = (value: string) =>
  value
    .split(' ')
    .map((item) => item[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

const toDateLabel = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const toHours = (value: string): number | null => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const diff = Date.now() - date.getTime()
  if (diff < 0) {
    return 0
  }

  return Math.round(diff / (1000 * 60 * 60))
}

const formatJobCode = (value: unknown): string => {
  const id = extractRelationshipID(value)
  if (typeof id === 'number') {
    return `JOB-${String(id).padStart(4, '0')}`
  }

  if (typeof id === 'string' && /^\d+$/.test(id)) {
    return `JOB-${id.padStart(4, '0')}`
  }

  return 'JOB-NA'
}

const buildQuery = ({
  dateRange,
  job,
  page,
  q,
  recruiter,
}: {
  dateRange: string
  job: string
  page: number
  q: string
  recruiter: string
}): string => {
  const params = new URLSearchParams()

  if (q) {
    params.set('q', q)
  }

  if (job) {
    params.set('job', job)
  }

  if (recruiter) {
    params.set('recruiter', recruiter)
  }

  if (dateRange) {
    params.set('dateRange', dateRange)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

type ApplicationsReviewQueuePageProps = {
  searchParams?: Promise<{
    dateRange?: string
    error?: string
    job?: string
    page?: string
    q?: string
    recruiter?: string
    success?: string
  }>
}

export default async function ApplicationsReviewQueuePage({ searchParams }: ApplicationsReviewQueuePageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchTerm = (resolvedSearchParams.q || '').trim().toLowerCase()
  const recruiterFilter = (resolvedSearchParams.recruiter || '').trim()
  const jobFilter = (resolvedSearchParams.job || '').trim()
  const dateRange = (resolvedSearchParams.dateRange || '7').trim()
  const pageInput = Number.parseInt(String(resolvedSearchParams.page || '1'), 10)

  const [pendingApplications, recentReviewActions] = await Promise.all([
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
      sort: 'updatedAt',
      user,
      where: {
        stage: {
          equals: 'internalReviewPending',
        },
      },
    }),
    payload.find({
      collection: 'application-stage-history',
      depth: 0,
      limit: 400,
      pagination: false,
      overrideAccess: false,
      select: {
        changedAt: true,
        toStage: true,
      },
      sort: '-changedAt',
      user,
      where: {
        toStage: {
          in: ['internalReviewApproved', 'internalReviewRejected', 'sentBackForCorrection'],
        },
      },
    }),
  ])

  const dateThreshold =
    dateRange === 'all' ? null : new Date(Date.now() - Number.parseInt(dateRange || '7', 10) * 24 * 60 * 60 * 1000)

  const filteredApplications = pendingApplications.docs.filter((application) => {
    const recruiterID = String(extractRelationshipID(application.recruiter) || '')
    const jobID = String(extractRelationshipID(application.job) || '')
    const updatedAt = new Date(application.updatedAt)
    const haystack = [
      readLabel(application.candidate),
      readLabel(application.job),
      readLabel(application.recruiter),
      formatJobCode(application.job),
    ]
      .join(' ')
      .toLowerCase()

    if (dateThreshold && updatedAt < dateThreshold) {
      return false
    }

    if (searchTerm && !haystack.includes(searchTerm)) {
      return false
    }

    if (recruiterFilter && recruiterID !== recruiterFilter) {
      return false
    }

    if (jobFilter && jobID !== jobFilter) {
      return false
    }

    return true
  })

  const recruiterOptions = Array.from(
    new Map(
      pendingApplications.docs.map((application) => [
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
      pendingApplications.docs.map((application) => [
        String(extractRelationshipID(application.job) || ''),
        { code: formatJobCode(application.job), title: readLabel(application.job) },
      ]),
    ).entries(),
  )
    .filter(([id]) => id.length > 0)
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => a.title.localeCompare(b.title))

  const waitHours = filteredApplications.map((application) => toHours(application.updatedAt)).filter((value): value is number => value !== null)
  const avgReviewHours = waitHours.length > 0 ? Math.round(waitHours.reduce((sum, item) => sum + item, 0) / waitHours.length) : 0

  const actionWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const actionWindow = recentReviewActions.docs.filter((entry) => new Date(entry.changedAt) >= actionWindowStart)
  const approvedCount = actionWindow.filter((entry) => entry.toStage === 'internalReviewApproved').length
  const approvalRate = actionWindow.length > 0 ? Math.round((approvedCount / actionWindow.length) * 100) : 0

  const totalRows = filteredApplications.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const currentPage = Number.isFinite(pageInput) ? Math.min(Math.max(pageInput, 1), totalPages) : 1
  const start = (currentPage - 1) * PAGE_SIZE
  const pagedRows = filteredApplications.slice(start, start + PAGE_SIZE)
  const showingFrom = totalRows === 0 ? 0 : start + 1
  const showingTo = Math.min(start + PAGE_SIZE, totalRows)

  return (
    <section className="lead-queue-page">
      <header className="lead-queue-header">
        <div>
          <p className="lead-queue-breadcrumb">Home &gt; Review Queue</p>
          <h1>Lead Review Queue</h1>
          <p>Strategic oversight for internal recruiter submissions.</p>
        </div>
        <div className="lead-queue-head-links">
          <Link href={APP_ROUTES.internal.applications.list}>Applications</Link>
          <Link href={APP_ROUTES.internal.jobs.assigned}>Jobs</Link>
        </div>
      </header>

      {resolvedSearchParams.success ? (
        <p className="lead-queue-banner lead-queue-banner-success">Candidate review updated successfully.</p>
      ) : null}
      {resolvedSearchParams.error ? (
        <p className="lead-queue-banner lead-queue-banner-error">{resolvedSearchParams.error}</p>
      ) : null}

      <section className="lead-queue-kpis">
        <article className="lead-queue-kpi-card">
          <p>Pending Reviews</p>
          <strong>{filteredApplications.length}</strong>
        </article>
        <article className="lead-queue-kpi-card">
          <p>Avg. Review Time</p>
          <strong>{avgReviewHours}h</strong>
        </article>
        <article className="lead-queue-kpi-card">
          <p>Approval Rate (30d)</p>
          <strong>{approvalRate}%</strong>
        </article>
      </section>

      <section className="lead-queue-filter-card">
        <form className="lead-queue-filters" method="get">
          <input
            className="lead-queue-search"
            defaultValue={resolvedSearchParams.q || ''}
            name="q"
            placeholder="Search by candidate, job, or ID..."
            type="search"
          />

          <select className="lead-queue-select" defaultValue={jobFilter} name="job">
            <option value="">Filter by Job</option>
            {jobOptions.map((jobOption) => (
              <option key={`job-option-${jobOption.id}`} value={jobOption.id}>
                {jobOption.title} ({jobOption.code})
              </option>
            ))}
          </select>

          <select className="lead-queue-select" defaultValue={recruiterFilter} name="recruiter">
            <option value="">Filter by Recruiter</option>
            {recruiterOptions.map((recruiterOption) => (
              <option key={`recruiter-option-${recruiterOption.id}`} value={recruiterOption.id}>
                {recruiterOption.label}
              </option>
            ))}
          </select>

          <select className="lead-queue-select" defaultValue={dateRange} name="dateRange">
            <option value="7">Date Range: Last 7 Days</option>
            <option value="14">Date Range: Last 14 Days</option>
            <option value="30">Date Range: Last 30 Days</option>
            <option value="all">Date Range: All</option>
          </select>

          <button className="lead-queue-filter-btn" type="submit">
            Filter
          </button>

          <Link className="lead-queue-reset-btn" href={APP_ROUTES.internal.applications.reviewQueue}>
            Reset
          </Link>
        </form>
      </section>

      <section className="lead-queue-table-card">
        <div className="lead-queue-table-wrap">
          <table className="lead-queue-table">
            <thead>
              <tr>
                <th>Candidate Name</th>
                <th>Job Title &amp; ID</th>
                <th>Submitted By</th>
                <th>Submission Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td className="lead-queue-empty" colSpan={6}>
                    No pending applications in this filter set.
                  </td>
                </tr>
              ) : (
                pagedRows.map((application) => (
                  <tr key={`review-queue-${application.id}`}>
                    <td>
                      <div className="lead-queue-candidate-cell">
                        <span className="lead-queue-avatar">{getInitials(readLabel(application.candidate, 'CD'))}</span>
                        <div>
                          <p>{readLabel(application.candidate)}</p>
                          <small>
                            <Link href={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}>Open full activity</Link>
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="lead-queue-job-cell">
                        <p>{readLabel(application.job)}</p>
                        <small>{formatJobCode(application.job)}</small>
                      </div>
                    </td>
                    <td>{readLabel(application.recruiter)}</td>
                    <td>{toDateLabel(application.updatedAt)}</td>
                    <td>
                      <span className="lead-queue-status-pill">
                        {APPLICATION_STAGE_LABELS[application.stage] || application.stage}
                      </span>
                    </td>
                    <td>
                      <form action={APP_ROUTES.internal.applications.review} className="lead-queue-action-form" method="post">
                        <input name="applicationId" type="hidden" value={application.id} />
                        <input
                          className="lead-queue-note-input"
                          defaultValue={application.latestComment || ''}
                          name="latestComment"
                          placeholder="Review comment"
                          type="text"
                        />
                        <button
                          className="lead-queue-icon-btn"
                          data-confirm-message="Send this application back for correction?"
                          data-pending-label="Sending back..."
                          name="action"
                          title="Send back for correction"
                          type="submit"
                          value="sendBack"
                        >
                          ↺
                        </button>
                        <button
                          className="lead-queue-reject-btn"
                          data-confirm-message="Reject this application?"
                          data-pending-label="Rejecting..."
                          name="action"
                          type="submit"
                          value="reject"
                        >
                          Reject
                        </button>
                        <button
                          className="lead-queue-approve-btn"
                          data-confirm-message="Approve this application?"
                          data-pending-label="Approving..."
                          name="action"
                          type="submit"
                          value="approve"
                        >
                          Approve
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="lead-queue-pagination">
          <p>
            Showing {showingFrom} to {showingTo} of {totalRows} pending submissions
          </p>
          <div className="lead-queue-page-controls">
            <Link
              aria-disabled={currentPage <= 1}
              className={`lead-queue-page-btn ${currentPage <= 1 ? 'lead-queue-page-btn-disabled' : ''}`}
              href={`${APP_ROUTES.internal.applications.reviewQueue}${buildQuery({
                dateRange,
                job: jobFilter,
                page: Math.max(1, currentPage - 1),
                q: searchTerm,
                recruiter: recruiterFilter,
              })}`}
            >
              ‹
            </Link>
            <span className="lead-queue-page-btn lead-queue-page-btn-active">{currentPage}</span>
            <Link
              aria-disabled={currentPage >= totalPages}
              className={`lead-queue-page-btn ${currentPage >= totalPages ? 'lead-queue-page-btn-disabled' : ''}`}
              href={`${APP_ROUTES.internal.applications.reviewQueue}${buildQuery({
                dateRange,
                job: jobFilter,
                page: Math.min(totalPages, currentPage + 1),
                q: searchTerm,
                recruiter: recruiterFilter,
              })}`}
            >
              ›
            </Link>
          </div>
        </footer>
      </section>
    </section>
  )
}
