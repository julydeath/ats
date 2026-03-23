import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload, type Where } from 'payload'

import { BulkTableControls } from '@/components/internal/BulkTableControls'
import { FilterToolbar } from '@/components/internal/FilterToolbar'
import { requireInternalRole } from '@/lib/auth/internal-auth'
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
    const typed = value as {
      name?: string
      title?: string
    }

    return typed.name || typed.title || fallback
  }

  return fallback
}

type AssignedJobsPageProps = {
  searchParams?: Promise<{
    priority?: string
    q?: string
    status?: string
  }>
}

export default async function AssignedJobsPage({ searchParams }: AssignedJobsPageProps) {
  const user = await requireInternalRole(['admin', 'headRecruiter', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchTerm = (resolvedSearchParams.q || '').trim()
  const statusFilter = resolvedSearchParams.status || ''
  const priorityFilter = resolvedSearchParams.priority || ''
  const canSourceCandidates = user.role === 'admin' || user.role === 'recruiter'

  const whereConditions: Where[] = [
    {
      status: {
        in: ['active', 'onHold'],
      },
    },
  ]

  if (statusFilter === 'active' || statusFilter === 'onHold') {
    whereConditions.push({
      status: {
        equals: statusFilter,
      },
    })
  }

  if (priorityFilter) {
    whereConditions.push({
      priority: {
        equals: priorityFilter,
      },
    })
  }

  if (searchTerm) {
    whereConditions.push({
      or: [
        {
          title: {
            contains: searchTerm,
          },
        },
        {
          location: {
            contains: searchTerm,
          },
        },
        {
          department: {
            contains: searchTerm,
          },
        },
      ],
    })
  }

  const whereQuery: Where =
    whereConditions.length === 1 ? whereConditions[0] : { and: whereConditions }

  const jobs = await payload.find({
    collection: 'jobs',
    depth: 1,
    limit: 120,
    pagination: false,
    overrideAccess: false,
    select: {
      client: true,
      experienceMax: true,
      experienceMin: true,
      id: true,
      location: true,
      openings: true,
      priority: true,
      status: true,
      title: true,
      updatedAt: true,
    },
    sort: '-updatedAt',
    user,
    where: whereQuery,
  })

  const activeJobs = jobs.docs.filter((job) => job.status === 'active')
  const onHoldJobs = jobs.docs.filter((job) => job.status === 'onHold')
  const urgentJobs = jobs.docs.filter((job) => job.priority === 'urgent')
  const highPriorityJobs = jobs.docs.filter((job) => job.priority === 'high' || job.priority === 'urgent')

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">Job Workspace</p>
        <h1>Assigned Job Execution Board</h1>
        <p className="panel-intro">
          Signed in as <strong>{INTERNAL_ROLE_LABELS[user.role]}</strong>. This board shows only jobs visible
          in your assignment hierarchy.
        </p>
      </article>

      <article className="panel">
        <h2>How To Run Jobs</h2>
        <div className="workflow-steps">
          <div className="workflow-step">
            <span className="workflow-step-number">1</span>
            <div>
              <p className="workflow-step-title">Pick active priority jobs</p>
              <p className="workflow-step-desc">Start with urgent and high priority openings.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">2</span>
            <div>
              <p className="workflow-step-title">Source candidates</p>
              <p className="workflow-step-desc">Create candidate records directly under selected job.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">3</span>
            <div>
              <p className="workflow-step-title">Create application and submit</p>
              <p className="workflow-step-desc">Move candidate into internal review flow.</p>
            </div>
          </div>
        </div>
      </article>

      <article className="panel">
        <h2>Pipeline Snapshot</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <p className="kpi-value">{activeJobs.length}</p>
            <p className="kpi-label">Active Jobs</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{onHoldJobs.length}</p>
            <p className="kpi-label">On Hold Jobs</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{urgentJobs.length}</p>
            <p className="kpi-label">Urgent Jobs</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{highPriorityJobs.length}</p>
            <p className="kpi-label">High/Urgent Jobs</p>
          </div>
        </div>
      </article>

      <FilterToolbar
        fields={[
          {
            key: 'q',
            label: 'Search',
            type: 'search',
            placeholder: 'Job title, location, or department',
          },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'On Hold', value: 'onHold' },
            ],
          },
          {
            key: 'priority',
            label: 'Priority',
            type: 'select',
            options: [
              { label: 'Urgent', value: 'urgent' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' },
            ],
          },
        ]}
        storageKey="jobs-assigned"
        title="Find Jobs Faster"
      />

      <article className="panel panel-span-2">
        <h2>Quick Actions</h2>
        <div className="public-actions">
          {canSourceCandidates ? (
            <Link className="button" href={APP_ROUTES.internal.candidates.new}>
              Add Candidate
            </Link>
          ) : null}
          <Link className="button button-secondary" href={APP_ROUTES.internal.candidates.list}>
            Candidate Bank
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.internal.applications.list}>
            Applications
          </Link>
          {(user.role === 'admin' || user.role === 'headRecruiter') ? (
            <Link className="button button-secondary" href={APP_ROUTES.internal.assignments.head}>
              Lead Assignment
            </Link>
          ) : null}
          {(user.role === 'admin' || user.role === 'headRecruiter' || user.role === 'leadRecruiter') ? (
            <Link className="button button-secondary" href={APP_ROUTES.internal.assignments.lead}>
              Recruiter Allocation
            </Link>
          ) : null}
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Visible Jobs</h2>
        <BulkTableControls exportFilename="jobs-selection.csv" itemLabel="job" tableId="jobs-table" />
        <div className="table-wrap">
          <table className="data-table" data-bulk-table="jobs-table">
            <thead>
              <tr>
                <th className="table-select-cell">Select</th>
                <th>Job</th>
                <th>Client</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Openings</th>
                <th>Experience</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.docs.length === 0 ? (
                <tr>
                  <td colSpan={9}>No active or on hold jobs in your visibility scope.</td>
                </tr>
              ) : (
                jobs.docs.map((job) => (
                  <tr key={`job-workspace-row-${job.id}`}>
                    <td className="table-select-cell">
                      <input
                        data-bulk-item="true"
                        data-row={JSON.stringify({
                          id: String(job.id),
                          job: job.title,
                          client: readLabel(job.client),
                          status: job.status,
                          priority: job.priority,
                        })}
                        type="checkbox"
                      />
                    </td>
                    <td>{job.title}</td>
                    <td>{readLabel(job.client)}</td>
                    <td>{job.status === 'onHold' ? 'On Hold' : 'Active'}</td>
                    <td>{job.priority}</td>
                    <td>{job.openings}</td>
                    <td>
                      {job.experienceMin ?? 0} - {job.experienceMax ?? 'Any'} years
                    </td>
                    <td>{job.location || 'Not set'}</td>
                    <td>
                      <div className="public-actions">
                        {canSourceCandidates ? (
                          <Link
                            className="button button-secondary"
                            href={`${APP_ROUTES.internal.candidates.new}?jobId=${job.id}`}
                          >
                            Add Candidate
                          </Link>
                        ) : null}
                        <Link
                          className="button button-secondary"
                          href={`${APP_ROUTES.internal.applications.new}?jobId=${job.id}`}
                        >
                          Create Application
                        </Link>
                      </div>
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
