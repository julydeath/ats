import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload, type Where } from 'payload'

import { BulkTableControls } from '@/components/internal/BulkTableControls'
import { FilterToolbar } from '@/components/internal/FilterToolbar'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import {
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
} from '@/lib/constants/recruitment'
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
    error?: string
    priority?: string
    q?: string
    status?: string
    success?: string
    warning?: string
  }>
}

const CREATE_JOB_STATUS_OPTIONS = JOB_STATUS_OPTIONS.filter(
  (option) => option.value === 'active' || option.value === 'onHold',
)

export default async function AssignedJobsPage({ searchParams }: AssignedJobsPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchTerm = (resolvedSearchParams.q || '').trim()
  const statusFilter = resolvedSearchParams.status || ''
  const priorityFilter = resolvedSearchParams.priority || ''
  const canCreateJobs = user.role === 'admin' || user.role === 'leadRecruiter'
  const canSourceCandidates = user.role === 'admin' || user.role === 'recruiter'
  const canEditLeadAssignments = user.role === 'admin'
  const canEditRecruiterAssignments =
    user.role === 'admin' || user.role === 'leadRecruiter'

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

  const [jobs, clientsResult, leadsResult] = await Promise.all([
    payload.find({
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
    }),
    canCreateJobs
      ? payload.find({
          collection: 'clients',
          depth: 0,
          limit: 200,
          pagination: false,
          overrideAccess: false,
          select: {
            id: true,
            name: true,
          },
          sort: 'name',
          user,
          where: {
            status: {
              equals: 'active',
            },
          },
        })
      : Promise.resolve(null),
    user.role === 'admin'
      ? payload.find({
          collection: 'users',
          depth: 0,
          limit: 150,
          pagination: false,
          overrideAccess: false,
          select: {
            email: true,
            fullName: true,
            id: true,
          },
          sort: 'fullName',
          user,
          where: {
            and: [
              {
                role: {
                  equals: 'leadRecruiter',
                },
              },
              {
                isActive: {
                  equals: true,
                },
              },
            ],
          },
        })
      : Promise.resolve(null),
  ])

  const availableClients = clientsResult?.docs ?? []
  const leadOptions =
    user.role === 'admin'
      ? leadsResult?.docs ?? []
      : [
          {
            email: user.email,
            fullName: user.fullName || user.email,
            id: user.id,
          },
        ]

  const activeJobs = jobs.docs.filter((job) => job.status === 'active')
  const onHoldJobs = jobs.docs.filter((job) => job.status === 'onHold')
  const urgentJobs = jobs.docs.filter((job) => job.priority === 'urgent')
  const highPriorityJobs = jobs.docs.filter((job) => job.priority === 'high' || job.priority === 'urgent')

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2 recruiter-hero-panel">
        <div>
          <p className="eyebrow">Jobs</p>
          <h1>{user.role === 'recruiter' ? 'My Assigned Jobs' : 'Assigned Job Control Center'}</h1>
          <p className="panel-intro">
            Signed in as <strong>{INTERNAL_ROLE_LABELS[user.role]}</strong>. Click any job to open board view,
            update applicant stages, and manage execution.
          </p>
          {resolvedSearchParams.success === 'jobCreated' ? (
            <p className="muted small">Job created successfully. Next, assign recruiter ownership from this page.</p>
          ) : null}
          {resolvedSearchParams.warning === 'leadAssignmentPending' ? (
            <p className="error-text">Job was created, but lead assignment row is pending. Use Assignment Controls below.</p>
          ) : null}
          {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}
        </div>
        <div className="public-actions">
          <Link className="button button-secondary" href={APP_ROUTES.internal.schedule}>
            Open Schedule
          </Link>
          {canSourceCandidates ? (
            <Link className="button" href={APP_ROUTES.internal.candidates.new}>
              Add Candidate
            </Link>
          ) : null}
        </div>
      </article>

      <article className="panel panel-span-2">
        <div className="stat-strip">
          <div className="stat-tile stat-tile-blue">
            <p className="stat-title">Active Jobs</p>
            <p className="stat-value">{activeJobs.length}</p>
            <p className="stat-meta">Currently open</p>
          </div>
          <div className="stat-tile stat-tile-slate">
            <p className="stat-title">On Hold</p>
            <p className="stat-value">{onHoldJobs.length}</p>
            <p className="stat-meta">Temporarily paused</p>
          </div>
          <div className="stat-tile stat-tile-purple">
            <p className="stat-title">Urgent</p>
            <p className="stat-value">{urgentJobs.length}</p>
            <p className="stat-meta">Needs immediate sourcing</p>
          </div>
          <div className="stat-tile stat-tile-green">
            <p className="stat-title">High / Urgent</p>
            <p className="stat-value">{highPriorityJobs.length}</p>
            <p className="stat-meta">Priority focus jobs</p>
          </div>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Assignment Controls</h2>
        <div className="public-actions">
          {canEditLeadAssignments ? (
            <Link className="button button-secondary" href={APP_ROUTES.internal.assignments.head}>
              Change Lead for Client/Job
            </Link>
          ) : null}
          {canEditRecruiterAssignments ? (
            <Link className="button button-secondary" href={APP_ROUTES.internal.assignments.lead}>
              Change Recruiter for Job
            </Link>
          ) : null}
          <Link className="button button-secondary" href={APP_ROUTES.internal.candidates.list}>
            Open Candidate Bank
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.internal.applications.list}>
            Open Applications
          </Link>
        </div>
      </article>

      {canCreateJobs ? (
        <article className="panel panel-span-2" id="create-job">
          <h2>Create Job</h2>
          <p className="panel-subtitle">
            Admin and Lead Recruiter can create jobs here. Job always links to a client and lead owner.
          </p>

          {availableClients.length === 0 ? (
            <p className="board-empty">
              No active clients available in your visibility scope. Assign a client to this lead before creating jobs.
            </p>
          ) : (
            <form action={APP_ROUTES.internal.jobs.create} className="auth-form" method="post">
              <div className="split-grid">
                <div>
                  <label className="form-field" htmlFor="job-clientId">
                    Client
                  </label>
                  <select className="input" defaultValue="" id="job-clientId" name="clientId" required>
                    <option value="">Select client</option>
                    {availableClients.map((client) => (
                      <option key={`create-job-client-${client.id}`} value={String(client.id)}>
                        {client.name}
                      </option>
                    ))}
                  </select>

                  <label className="form-field" htmlFor="job-title">
                    Job Title
                  </label>
                  <input className="input" id="job-title" name="title" required type="text" />

                  <label className="form-field" htmlFor="job-department">
                    Department
                  </label>
                  <input className="input" id="job-department" name="department" type="text" />

                  <label className="form-field" htmlFor="job-employmentType">
                    Employment Type
                  </label>
                  <select className="input" defaultValue="fullTime" id="job-employmentType" name="employmentType" required>
                    {JOB_EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                      <option key={`create-job-employment-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <label className="form-field" htmlFor="job-location">
                    Location
                  </label>
                  <input className="input" id="job-location" name="location" type="text" />
                </div>

                <div>
                  {user.role === 'admin' ? (
                    <>
                      <label className="form-field" htmlFor="job-leadRecruiterId">
                        Lead Recruiter
                      </label>
                      <select className="input" defaultValue="" id="job-leadRecruiterId" name="leadRecruiterId" required>
                        <option value="">Select lead recruiter</option>
                        {leadOptions.map((lead) => (
                          <option key={`create-job-lead-${lead.id}`} value={String(lead.id)}>
                            {lead.fullName || lead.email}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <input name="leadRecruiterId" type="hidden" value={String(user.id)} />
                  )}

                  <label className="form-field" htmlFor="job-priority">
                    Priority
                  </label>
                  <select className="input" defaultValue="medium" id="job-priority" name="priority">
                    {JOB_PRIORITY_OPTIONS.map((option) => (
                      <option key={`create-job-priority-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <label className="form-field" htmlFor="job-status">
                    Status
                  </label>
                  <select className="input" defaultValue="active" id="job-status" name="status">
                    {CREATE_JOB_STATUS_OPTIONS.map((option) => (
                      <option key={`create-job-status-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <label className="form-field" htmlFor="job-openings">
                    Openings
                  </label>
                  <input className="input" defaultValue={1} id="job-openings" min={1} name="openings" type="number" />

                  <label className="form-field" htmlFor="job-targetClosureDate">
                    Target Closure Date
                  </label>
                  <input className="input" id="job-targetClosureDate" name="targetClosureDate" type="date" />
                </div>
              </div>

              <div className="split-grid">
                <div>
                  <label className="form-field" htmlFor="job-experienceMin">
                    Experience Min (Years)
                  </label>
                  <input className="input" id="job-experienceMin" min={0} name="experienceMin" type="number" />

                  <label className="form-field" htmlFor="job-experienceMax">
                    Experience Max (Years)
                  </label>
                  <input className="input" id="job-experienceMax" min={0} name="experienceMax" type="number" />
                </div>
                <div>
                  <label className="form-field" htmlFor="job-salaryMin">
                    Salary Min
                  </label>
                  <input className="input" id="job-salaryMin" min={0} name="salaryMin" type="number" />

                  <label className="form-field" htmlFor="job-salaryMax">
                    Salary Max
                  </label>
                  <input className="input" id="job-salaryMax" min={0} name="salaryMax" type="number" />
                </div>
              </div>

              <label className="form-field" htmlFor="job-description">
                Description
              </label>
              <textarea className="input" id="job-description" name="description" required rows={4} />

              <label className="form-field" htmlFor="job-requiredSkills">
                Required Skills (comma or new line separated)
              </label>
              <textarea
                className="input"
                id="job-requiredSkills"
                name="requiredSkills"
                placeholder="React, TypeScript, PostgreSQL"
                rows={3}
              />

              <div className="public-actions">
                <button className="button" data-pending-label="Creating..." type="submit">
                  Create Job
                </button>
                <Link className="button button-secondary" href={APP_ROUTES.internal.assignments.lead}>
                  Assign Recruiter
                </Link>
                {canEditLeadAssignments ? (
                  <Link className="button button-secondary" href={APP_ROUTES.internal.assignments.head}>
                    Assign Lead
                  </Link>
                ) : null}
              </div>
            </form>
          )}
        </article>
      ) : null}

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
        title="Find Assigned Jobs"
      />

      <article className="panel panel-span-2">
        <div className="recruiter-card-header">
          <h2>Assigned Jobs</h2>
          <p className="muted small">Click Open Board to work in Kanban view.</p>
        </div>
        <div className="workspace-grid recruiter-job-workspace-grid">
          {jobs.docs.length === 0 ? (
            <p className="board-empty">No assigned jobs found in your visibility scope.</p>
          ) : (
            jobs.docs.map((job) => (
              <article className="workspace-card recruiter-job-workspace-card" key={`assigned-job-card-${job.id}`}>
                <p className="workspace-title">{job.title}</p>
                <p className="workspace-desc">Client: {readLabel(job.client)}</p>
                <p className="workspace-desc">
                  Priority: {job.priority} | Openings: {job.openings}
                </p>
                <p className="workspace-desc">
                  Experience: {job.experienceMin ?? 0} - {job.experienceMax ?? 'Any'} years
                </p>
                <div className="public-actions">
                  <Link className="button" href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}`}>
                    Open Board
                  </Link>
                  {canSourceCandidates ? (
                    <Link
                      className="button button-secondary"
                      href={`${APP_ROUTES.internal.candidates.new}?jobId=${job.id}`}
                    >
                      Add Candidate
                    </Link>
                  ) : null}
                  {canEditRecruiterAssignments ? (
                    <Link className="button button-secondary" href={APP_ROUTES.internal.assignments.lead}>
                      Reassign Recruiter
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Jobs Table</h2>
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
                        <Link className="button button-secondary" href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}`}>
                          Open Board
                        </Link>
                        {canSourceCandidates ? (
                          <Link
                            className="button button-secondary"
                            href={`${APP_ROUTES.internal.candidates.new}?jobId=${job.id}`}
                          >
                            Add Candidate
                          </Link>
                        ) : null}
                        {canEditRecruiterAssignments ? (
                          <Link className="button button-secondary" href={APP_ROUTES.internal.assignments.lead}>
                            Reassign
                          </Link>
                        ) : null}
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
