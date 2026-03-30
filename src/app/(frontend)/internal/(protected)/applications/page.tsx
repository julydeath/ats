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

const canRecruiterSubmit = ({
  stage,
  userRole,
}: {
  stage: unknown
  userRole: string
}): boolean => {
  if (userRole !== 'admin' && userRole !== 'leadRecruiter') {
    return false
  }

  if (stage !== 'sourcedByRecruiter' && stage !== 'sentBackForCorrection') {
    return false
  }

  return true
}

type StageColumn = {
  key: ApplicationStage
  label: string
  tone: 'blue' | 'orange' | 'purple' | 'green' | 'slate' | 'red'
}

const BOARD_COLUMNS: readonly StageColumn[] = [
  { key: 'sourcedByRecruiter', label: 'Applied', tone: 'slate' },
  { key: 'internalReviewPending', label: 'Screening', tone: 'orange' },
  { key: 'sentBackForCorrection', label: 'Correction', tone: 'purple' },
  { key: 'internalReviewApproved', label: 'Approved', tone: 'green' },
  { key: 'candidateInvited', label: 'Invited', tone: 'blue' },
  { key: 'candidateApplied', label: 'Candidate Applied', tone: 'blue' },
  { key: 'internalReviewRejected', label: 'Rejected', tone: 'red' },
]

type ApplicationsListPageProps = {
  searchParams?: Promise<{
    error?: string
    q?: string
    stage?: string
    success?: string
  }>
}

export default async function ApplicationsListPage({ searchParams }: ApplicationsListPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const canCreate = user.role === 'admin' || user.role === 'leadRecruiter'
  const canReview = user.role === 'admin' || user.role === 'leadRecruiter'
  const query = (resolvedSearchParams.q || '').trim().toLowerCase()
  const stageFilter = (resolvedSearchParams.stage || '').trim()

  const applications = await payload.find({
    collection: 'applications',
    depth: 1,
    limit: 180,
    pagination: false,
    overrideAccess: false,
    select: {
      candidate: true,
      id: true,
      job: true,
      latestComment: true,
      notes: true,
      recruiter: true,
      stage: true,
      updatedAt: true,
    },
    sort: '-updatedAt',
    user,
  })

  const filtered = applications.docs.filter((application) => {
    if (stageFilter && application.stage !== stageFilter) {
      return false
    }

    if (!query) {
      return true
    }

    const haystack = [
      readLabel(application.candidate),
      readLabel(application.job),
      readLabel(application.recruiter),
      application.latestComment || '',
      application.notes || '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })

  const boardData = BOARD_COLUMNS.map((column) => ({
    ...column,
    docs: filtered.filter((application) => application.stage === column.key),
  }))

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <div className="board-header">
          <div>
            <p className="eyebrow">Application Board</p>
            <h1>Candidate Workflow Pipeline</h1>
            <p className="panel-intro">
              {INTERNAL_ROLE_LABELS[user.role]} workspace with stage-wise applicant flow and quick actions.
            </p>
            {resolvedSearchParams.success ? <p className="muted small">Action completed successfully.</p> : null}
            {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}
          </div>
          <div className="public-actions">
            {canCreate ? (
              <Link className="button" href={APP_ROUTES.internal.applications.new}>
                Add Applicant
              </Link>
            ) : null}
            <Link className="button button-secondary" href={APP_ROUTES.internal.candidates.list}>
              Candidate Bank
            </Link>
          </div>
        </div>
      </article>

      <article className="panel panel-span-2">
        <form action={APP_ROUTES.internal.applications.list} className="board-toolbar" method="get">
          <input
            className="input"
            defaultValue={resolvedSearchParams.q || ''}
            name="q"
            placeholder="Search candidate, job, recruiter"
            type="search"
          />
          <select className="input" defaultValue={stageFilter} name="stage">
            <option value="">All stages</option>
            {BOARD_COLUMNS.map((column) => (
              <option key={`stage-filter-${column.key}`} value={column.key}>
                {APPLICATION_STAGE_LABELS[column.key]}
              </option>
            ))}
          </select>
          <button className="button button-secondary" type="submit">
            Apply
          </button>
          <Link className="button button-secondary" href={APP_ROUTES.internal.applications.list}>
            Reset
          </Link>
        </form>
      </article>

      <article className="panel panel-span-2">
        <div className="board-scroll">
          {boardData.map((column) => (
            <section className="stage-column" key={column.key}>
              <header className="stage-column-header">
                <div className="stage-column-title-wrap">
                  <span className={`stage-dot stage-dot-${column.tone}`} />
                  <h3>{column.label}</h3>
                </div>
                <span className="stage-count">{column.docs.length}</span>
              </header>

              <div className="stage-cards">
                {column.docs.length === 0 ? (
                  <p className="board-empty">No candidates in this stage.</p>
                ) : (
                  column.docs.map((application) => (
                    <article className="stage-card" key={`application-${column.key}-${application.id}`}>
                      <p className="stage-card-name">{readLabel(application.candidate)}</p>
                      <p className="stage-card-meta">{readLabel(application.job)}</p>
                      <p className="stage-card-meta">Recruiter: {readLabel(application.recruiter)}</p>
                      <p className="stage-card-meta">
                        Updated: {new Date(application.updatedAt).toLocaleString('en-IN')}
                      </p>
                      {application.latestComment ? (
                        <p className="stage-card-note">&quot;{application.latestComment}&quot;</p>
                      ) : null}

                      <div className="public-actions">
                        <Link
                          className="button button-secondary"
                          href={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}
                        >
                          Open
                        </Link>
                      </div>

                      {canRecruiterSubmit({
                        stage: application.stage,
                        userRole: user.role,
                      }) ? (
                        <form action={APP_ROUTES.internal.applications.submit} className="auth-form" method="post">
                          <input name="applicationId" type="hidden" value={application.id} />
                          <input
                            className="input table-input"
                            name="latestComment"
                            placeholder="Comment for reviewer"
                            type="text"
                          />
                          <button className="button" data-pending-label="Submitting..." type="submit">
                            Send For Review
                          </button>
                        </form>
                      ) : null}

                      {canReview && application.stage === 'internalReviewPending' ? (
                        <form action={APP_ROUTES.internal.applications.review} className="auth-form" method="post">
                          <input name="applicationId" type="hidden" value={application.id} />
                          <textarea
                            className="input"
                            name="latestComment"
                            placeholder="Reviewer comment"
                            rows={2}
                          />
                          <div className="public-actions">
                            <button
                              className="button button-secondary"
                              data-confirm-message="Approve this application?"
                              data-pending-label="Approving..."
                              name="action"
                              type="submit"
                              value="approve"
                            >
                              Approve
                            </button>
                            <button
                              className="button button-secondary"
                              data-confirm-message="Send back for correction?"
                              data-pending-label="Sending..."
                              name="action"
                              type="submit"
                              value="sendBack"
                            >
                              Send Back
                            </button>
                            <button
                              className="button button-secondary"
                              data-confirm-message="Reject this application?"
                              data-pending-label="Rejecting..."
                              name="action"
                              type="submit"
                              value="reject"
                            >
                              Reject
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </article>
    </section>
  )
}
