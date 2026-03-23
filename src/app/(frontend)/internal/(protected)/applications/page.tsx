import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { BulkTableControls } from '@/components/internal/BulkTableControls'
import { FilterToolbar } from '@/components/internal/FilterToolbar'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import {
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGE_OPTIONS,
  type ApplicationStage,
} from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'
import { extractRelationshipID } from '@/lib/utils/relationships'

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

const readStageLabel = (stage: unknown): string => {
  if (!stage || typeof stage !== 'string') {
    return 'Unknown'
  }

  return APPLICATION_STAGE_LABELS[stage as ApplicationStage] || stage
}

const canRecruiterSubmit = ({
  recruiter,
  stage,
  userID,
  userRole,
}: {
  recruiter: unknown
  stage: unknown
  userID: number | string
  userRole: string
}): boolean => {
  if (userRole !== 'admin' && userRole !== 'recruiter') {
    return false
  }

  if (stage !== 'sourcedByRecruiter' && stage !== 'sentBackForCorrection') {
    return false
  }

  if (userRole === 'admin') {
    return true
  }

  return String(extractRelationshipID(recruiter)) === String(userID)
}

type ApplicationsListPageProps = {
  searchParams?: Promise<{
    error?: string
    q?: string
    stage?: string
    success?: string
  }>
}

export default async function ApplicationsListPage({ searchParams }: ApplicationsListPageProps) {
  const user = await requireInternalRole(['admin', 'headRecruiter', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchTerm = (resolvedSearchParams.q || '').trim().toLowerCase()
  const stageFilter = resolvedSearchParams.stage || ''
  const canCreate = user.role === 'admin' || user.role === 'recruiter'
  const canOpenReviewQueue =
    user.role === 'admin' || user.role === 'headRecruiter' || user.role === 'leadRecruiter'

  const applications = await payload.find({
    collection: 'applications',
    depth: 1,
    limit: 120,
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
    where: stageFilter
      ? {
          stage: {
            equals: stageFilter,
          },
        }
      : undefined,
  })

  const filteredApplications = applications.docs.filter((application) => {
    if (!searchTerm) {
      return true
    }

    const searchable = [
      readLabel(application.candidate),
      readLabel(application.job),
      readLabel(application.recruiter),
      application.latestComment || '',
    ]
      .join(' ')
      .toLowerCase()

    return searchable.includes(searchTerm)
  })

  const draftOrCorrection = filteredApplications.filter(
    (application) =>
      application.stage === 'sourcedByRecruiter' || application.stage === 'sentBackForCorrection',
  )
  const pendingReview = filteredApplications.filter((application) => application.stage === 'internalReviewPending')
  const approvedOrInvited = filteredApplications.filter(
    (application) =>
      application.stage === 'internalReviewApproved' ||
      application.stage === 'candidateInvited' ||
      application.stage === 'candidateApplied',
  )
  const rejected = filteredApplications.filter((application) => application.stage === 'internalReviewRejected')

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">Application Pipeline</p>
        <h1>Candidate to Job Workflow</h1>
        <p className="panel-intro">
          Signed in as <strong>{INTERNAL_ROLE_LABELS[user.role]}</strong>. This is the controlled pipeline
          between sourcing and internal approval.
        </p>
        {resolvedSearchParams.success ? <p className="muted small">Action completed successfully.</p> : null}
        {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}
        <div className="public-actions">
          {canCreate ? (
            <Link className="button" href={APP_ROUTES.internal.applications.new}>
              Create Application
            </Link>
          ) : null}
          {canOpenReviewQueue ? (
            <Link className="button button-secondary" href={APP_ROUTES.internal.applications.reviewQueue}>
              Open Review Queue
            </Link>
          ) : null}
        </div>
      </article>

      <article className="panel">
        <h2>How This Flow Works</h2>
        <div className="workflow-steps">
          <div className="workflow-step">
            <span className="workflow-step-number">1</span>
            <div>
              <p className="workflow-step-title">Recruiter creates application</p>
              <p className="workflow-step-desc">Candidate gets mapped to a job with sourcing context.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">2</span>
            <div>
              <p className="workflow-step-title">Recruiter submits for review</p>
              <p className="workflow-step-desc">Lead recruiter receives it in Internal Review Pending.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">3</span>
            <div>
              <p className="workflow-step-title">Lead approves, rejects, or sends back</p>
              <p className="workflow-step-desc">Every stage movement is recorded in activity history.</p>
            </div>
          </div>
        </div>
      </article>

      <article className="panel">
        <h2>Pipeline Snapshot</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <p className="kpi-value">{filteredApplications.length}</p>
            <p className="kpi-label">Applications In Current View</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{draftOrCorrection.length}</p>
            <p className="kpi-label">Draft or Correction</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{pendingReview.length}</p>
            <p className="kpi-label">Pending Internal Review</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{approvedOrInvited.length}</p>
            <p className="kpi-label">Approved / Invited / Applied</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{rejected.length}</p>
            <p className="kpi-label">Rejected</p>
          </div>
        </div>
      </article>

      <FilterToolbar
        fields={[
          {
            key: 'q',
            label: 'Search',
            type: 'search',
            placeholder: 'Candidate, job, recruiter, or comment',
          },
          {
            key: 'stage',
            label: 'Stage',
            type: 'select',
            options: APPLICATION_STAGE_OPTIONS,
          },
        ]}
        storageKey="applications-list"
        title="Filter Application Pipeline"
      />

      <article className="panel panel-span-2">
        <h2>Application Flow Board</h2>
        <div className="kanban-board">
          <section className="kanban-column">
            <div className="kanban-column-header">
              <h3>Draft or Correction</h3>
              <span className="kanban-count">{draftOrCorrection.length}</span>
            </div>
            <div className="kanban-cards">
              {draftOrCorrection.length === 0 ? (
                <p className="board-empty">No applications waiting for recruiter action.</p>
              ) : (
                draftOrCorrection.slice(0, 8).map((application) => (
                  <article className="kanban-card" key={`board-draft-${application.id}`}>
                    <p className="kanban-title">{readLabel(application.candidate)}</p>
                    <p className="kanban-meta">Job: {readLabel(application.job)}</p>
                    <p className="kanban-meta">Recruiter: {readLabel(application.recruiter)}</p>
                    <p className="kanban-meta">Stage: {readStageLabel(application.stage)}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="kanban-column">
            <div className="kanban-column-header">
              <h3>Internal Review Pending</h3>
              <span className="kanban-count">{pendingReview.length}</span>
            </div>
            <div className="kanban-cards">
              {pendingReview.length === 0 ? (
                <p className="board-empty">No applications in pending review.</p>
              ) : (
                pendingReview.slice(0, 8).map((application) => (
                  <article className="kanban-card" key={`board-pending-${application.id}`}>
                    <p className="kanban-title">{readLabel(application.candidate)}</p>
                    <p className="kanban-meta">Job: {readLabel(application.job)}</p>
                    <p className="kanban-meta">Recruiter: {readLabel(application.recruiter)}</p>
                    <div className="public-actions">
                      <Link
                        className="button button-secondary"
                        href={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}
                      >
                        Open Activity
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="kanban-column">
            <div className="kanban-column-header">
              <h3>Approved or Candidate Progress</h3>
              <span className="kanban-count">{approvedOrInvited.length}</span>
            </div>
            <div className="kanban-cards">
              {approvedOrInvited.length === 0 ? (
                <p className="board-empty">No approved or candidate-progress applications yet.</p>
              ) : (
                approvedOrInvited.slice(0, 8).map((application) => (
                  <article className="kanban-card" key={`board-approved-${application.id}`}>
                    <p className="kanban-title">{readLabel(application.candidate)}</p>
                    <p className="kanban-meta">Job: {readLabel(application.job)}</p>
                    <p className="kanban-meta">Stage: {readStageLabel(application.stage)}</p>
                    <p className="kanban-meta">Updated: {new Date(application.updatedAt).toLocaleDateString()}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="kanban-column">
            <div className="kanban-column-header">
              <h3>Rejected</h3>
              <span className="kanban-count">{rejected.length}</span>
            </div>
            <div className="kanban-cards">
              {rejected.length === 0 ? (
                <p className="board-empty">No rejected applications.</p>
              ) : (
                rejected.slice(0, 8).map((application) => (
                  <article className="kanban-card" key={`board-rejected-${application.id}`}>
                    <p className="kanban-title">{readLabel(application.candidate)}</p>
                    <p className="kanban-meta">Job: {readLabel(application.job)}</p>
                    <p className="kanban-meta">Comment: {application.latestComment || 'No comment'}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Application Control Table</h2>
        <BulkTableControls
          exportFilename="applications-selection.csv"
          itemLabel="application"
          tableId="applications-table"
        />
        {filteredApplications.length === 0 ? (
          <p className="board-empty">No applications found in your visibility scope.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table" data-bulk-table="applications-table">
              <thead>
                <tr>
                  <th className="table-select-cell">Select</th>
                  <th>Candidate</th>
                  <th>Job</th>
                  <th>Recruiter</th>
                  <th>Current Stage</th>
                  <th>Latest Comment</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((application) => (
                  <tr key={`application-row-${application.id}`}>
                    <td className="table-select-cell">
                      <input
                        data-bulk-item="true"
                        data-row={JSON.stringify({
                          id: String(application.id),
                          candidate: readLabel(application.candidate),
                          job: readLabel(application.job),
                          recruiter: readLabel(application.recruiter),
                          stage: readStageLabel(application.stage),
                        })}
                        type="checkbox"
                      />
                    </td>
                    <td>{readLabel(application.candidate)}</td>
                    <td>{readLabel(application.job)}</td>
                    <td>{readLabel(application.recruiter)}</td>
                    <td>{readStageLabel(application.stage)}</td>
                    <td>{application.latestComment || 'No comment'}</td>
                    <td>{new Date(application.updatedAt).toLocaleString()}</td>
                    <td>
                      <div className="action-inline">
                        <Link
                          className="button button-secondary"
                          href={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}
                        >
                          Open Activity
                        </Link>

                        {canRecruiterSubmit({
                          recruiter: application.recruiter,
                          stage: application.stage,
                          userID: user.id,
                          userRole: user.role,
                        }) ? (
                          <form action={APP_ROUTES.internal.applications.submit} method="post">
                            <input name="applicationId" type="hidden" value={application.id} />
                            <input
                              className="input table-input"
                              name="latestComment"
                              placeholder="Comment for lead recruiter"
                              type="text"
                            />
                            <button className="button" data-pending-label="Submitting..." type="submit">
                              Send For Internal Review
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
