import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload, type Where } from 'payload'

import type { Application, Job, RecruiterJobAssignment } from '@/payload-types'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import {
  APPLICATION_STAGE_LABELS,
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
} from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as { email?: string; fullName?: string; name?: string; title?: string }
    return typed.fullName || typed.name || typed.title || typed.email || fallback
  }

  return fallback
}

const toInitials = (value: string): string =>
  value
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

const toRelativeTime = (value: string): string => {
  const diffMs = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diffMs / (1000 * 60))

  if (mins < 1) {
    return 'Just now'
  }

  if (mins < 60) {
    return `${mins} mins ago`
  }

  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const toISODate = (value: Date): string => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toStatusLabel = (value: string): string => {
  if (value === 'onHold') {
    return 'On Hold'
  }

  if (value === 'inactive') {
    return 'Draft'
  }

  if (value === 'active') {
    return 'Open'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

const parseNumericFilter = (value: string): number | null => {
  if (!/^\d+$/.test(value)) {
    return null
  }

  return Number(value)
}

const CREATE_JOB_STATUS_OPTIONS = JOB_STATUS_OPTIONS.filter(
  (option) => option.value === 'active' || option.value === 'onHold',
)

const STATUS_VALUES = new Set(['active', 'onHold', 'closed', 'inactive'])
const PRIORITY_VALUES = new Set(['low', 'medium', 'high', 'urgent'])
const DATE_RANGE_OPTIONS = new Set(['7', '30', '60', '90'])

type AssignedJobsPageProps = {
  searchParams?: Promise<{
    client?: string
    create?: string
    dateRange?: string
    error?: string
    priority?: string
    q?: string
    status?: string
    success?: string
    warning?: string
  }>
}

export default async function AssignedJobsPage({ searchParams }: AssignedJobsPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}

  const searchTerm = String(resolvedSearchParams.q || '').trim()
  const statusFilter = STATUS_VALUES.has(String(resolvedSearchParams.status || ''))
    ? String(resolvedSearchParams.status)
    : ''
  const priorityFilter = PRIORITY_VALUES.has(String(resolvedSearchParams.priority || ''))
    ? String(resolvedSearchParams.priority)
    : ''
  const clientFilterRaw = String(resolvedSearchParams.client || '')
  const clientFilter = parseNumericFilter(clientFilterRaw)
  const dateRangeFilter = DATE_RANGE_OPTIONS.has(String(resolvedSearchParams.dateRange || '30'))
    ? String(resolvedSearchParams.dateRange || '30')
    : '30'
  const isCreateModalOpen = resolvedSearchParams.create === '1'
  const canCreateJobs = user.role === 'admin' || user.role === 'leadRecruiter'
  const canSourceCandidates = user.role === 'admin' || user.role === 'recruiter'

  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - Number(dateRangeFilter))
  rangeStart.setHours(0, 0, 0, 0)

  const whereConditions: Where[] = [
    {
      updatedAt: {
        greater_than_equal: rangeStart.toISOString(),
      },
    },
  ]

  if (statusFilter) {
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

  if (clientFilter) {
    whereConditions.push({
      client: {
        equals: clientFilter,
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

  const [jobsResult, clientsResult, leadsResult, recruiterAssignmentsResult, applicationsResult, stageHistory, weeklyCandidates] =
    await Promise.all([
      payload.find({
        collection: 'jobs',
        depth: 1,
        limit: 160,
        overrideAccess: false,
        pagination: false,
        select: {
          client: true,
          createdAt: true,
          employmentType: true,
          id: true,
          location: true,
          openings: true,
          owningHeadRecruiter: true,
          priority: true,
          status: true,
          targetClosureDate: true,
          title: true,
          updatedAt: true,
        },
        sort: '-updatedAt',
        user,
        where: whereQuery,
      }),
      payload.find({
        collection: 'clients',
        depth: 0,
        limit: 200,
        overrideAccess: false,
        pagination: false,
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
      }),
      user.role === 'admin'
        ? payload.find({
            collection: 'users',
            depth: 0,
            limit: 150,
            overrideAccess: false,
            pagination: false,
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
      payload.find({
        collection: 'recruiter-job-assignments',
        depth: 1,
        limit: 500,
        overrideAccess: false,
        pagination: false,
        select: {
          job: true,
          recruiter: true,
          status: true,
        },
        sort: '-updatedAt',
        user,
        where: {
          status: {
            equals: 'active',
          },
        },
      }),
      payload.find({
        collection: 'applications',
        depth: 0,
        limit: 1500,
        overrideAccess: false,
        pagination: false,
        select: {
          id: true,
          job: true,
          stage: true,
        },
        user,
      }),
      payload.find({
        collection: 'application-stage-history',
        depth: 1,
        limit: 6,
        overrideAccess: false,
        pagination: false,
        select: {
          candidate: true,
          changedAt: true,
          job: true,
          toStage: true,
        },
        sort: '-changedAt',
        user,
      }),
      payload.count({
        collection: 'candidates',
        overrideAccess: false,
        user,
        where: {
          createdAt: {
            greater_than_equal: (() => {
              const value = new Date()
              value.setDate(value.getDate() - 7)
              value.setHours(0, 0, 0, 0)
              return value.toISOString()
            })(),
          },
        },
      }),
    ])

  const jobs = jobsResult.docs as Array<
    Pick<
      Job,
      | 'id'
      | 'title'
      | 'client'
      | 'location'
      | 'priority'
      | 'status'
      | 'openings'
      | 'employmentType'
      | 'createdAt'
      | 'updatedAt'
      | 'owningHeadRecruiter'
      | 'targetClosureDate'
    >
  >
  const recruiterAssignments = recruiterAssignmentsResult.docs as Array<
    Pick<RecruiterJobAssignment, 'job' | 'recruiter' | 'status'>
  >
  const applications = applicationsResult.docs as Array<Pick<Application, 'id' | 'job' | 'stage'>>

  const recruiterNamesByJobID = new Map<string, string[]>()
  recruiterAssignments.forEach((assignment) => {
    const jobID = extractRelationshipID(assignment.job)
    if (!jobID) {
      return
    }

    const key = String(jobID)
    const current = recruiterNamesByJobID.get(key) || []
    const recruiterName = readLabel(assignment.recruiter)
    recruiterNamesByJobID.set(key, [...current, recruiterName])
  })

  const candidatesCountByJobID = new Map<string, number>()
  applications.forEach((application) => {
    const jobID = extractRelationshipID(application.job)
    if (!jobID) {
      return
    }

    const key = String(jobID)
    candidatesCountByJobID.set(key, (candidatesCountByJobID.get(key) || 0) + 1)
  })

  const activeJobs = jobs.filter((job) => job.status === 'active' || job.status === 'onHold')
  const urgentFill = activeJobs.filter((job) => job.priority === 'urgent').length
  const averageDaysOpen = activeJobs.length
    ? Math.round(
        activeJobs.reduce((sum, job) => {
          const createdAt = new Date(job.createdAt).getTime()
          const diffDays = Math.max((Date.now() - createdAt) / (1000 * 60 * 60 * 24), 0)
          return sum + diffDays
        }, 0) / activeJobs.length,
      )
    : 0

  const leadsOptions =
    user.role === 'admin'
      ? leadsResult?.docs ?? []
      : [
          {
            email: user.email,
            fullName: user.fullName || user.email,
            id: user.id,
          },
        ]

  const successMessage =
    resolvedSearchParams.success === 'jobCreated'
      ? 'Job created successfully.'
      : resolvedSearchParams.success === 'jobReactivated'
        ? 'Existing job was reactivated successfully.'
        : ''

  return (
    <section className="jobs-workspace-page">
      <header className="jobs-workspace-header">
        <div>
          <p className="jobs-workspace-kicker">Workspace | Jobs Inventory</p>
          <h1>Active Opportunities</h1>
        </div>

        <div className="jobs-workspace-header-actions">
          <Link className="jobs-header-button" href={APP_ROUTES.internal.applications.list}>
            Export Data
          </Link>
          {canCreateJobs ? (
            <Link className="jobs-header-button jobs-header-button-primary" href={`${APP_ROUTES.internal.jobs.assigned}?create=1`}>
              + Post New Job
            </Link>
          ) : null}
        </div>
      </header>

      {successMessage ? <p className="jobs-feedback jobs-feedback-success">{successMessage}</p> : null}
      {resolvedSearchParams.warning ? (
        <p className="jobs-feedback jobs-feedback-warning">Job created, but lead assignment row is still pending.</p>
      ) : null}
      {resolvedSearchParams.error ? <p className="jobs-feedback jobs-feedback-error">{resolvedSearchParams.error}</p> : null}

      <section className="jobs-kpi-grid">
        <article className="jobs-kpi-card">
          <p>Total Active</p>
          <strong>{activeJobs.length}</strong>
        </article>
        <article className="jobs-kpi-card">
          <p>Urgent Fill</p>
          <strong>{urgentFill}</strong>
        </article>
        <article className="jobs-kpi-card">
          <p>Avg. Time Open</p>
          <strong>{averageDaysOpen}d</strong>
        </article>
        <article className="jobs-kpi-card jobs-kpi-card-highlight">
          <p>Talent Pool Growth</p>
          <strong>{weeklyCandidates.totalDocs.toLocaleString('en-US')}</strong>
          <span>New candidates in last 7 days</span>
        </article>
      </section>

      <article className="jobs-surface-card">
        <form className="jobs-toolbar" method="get">
          <label className="jobs-toolbar-field jobs-toolbar-field-search" htmlFor="jobs-search">
            <span>Search</span>
            <input
              defaultValue={searchTerm}
              id="jobs-search"
              name="q"
              placeholder="Search across workspace..."
              type="text"
            />
          </label>

          <label className="jobs-toolbar-field" htmlFor="jobs-client">
            <span>Client</span>
            <select defaultValue={clientFilterRaw} id="jobs-client" name="client">
              <option value="">All Clients</option>
              {clientsResult.docs.map((client) => (
                <option key={`jobs-filter-client-${client.id}`} value={String(client.id)}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="jobs-toolbar-field" htmlFor="jobs-status">
            <span>Status</span>
            <select defaultValue={statusFilter} id="jobs-status" name="status">
              <option value="">All Status</option>
              {JOB_STATUS_OPTIONS.map((option) => (
                <option key={`jobs-filter-status-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="jobs-toolbar-field" htmlFor="jobs-date-range">
            <span>Date Range</span>
            <select defaultValue={dateRangeFilter} id="jobs-date-range" name="dateRange">
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="60">Last 60 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </label>

          <button className="jobs-toolbar-button" type="submit">
            Apply
          </button>
          <Link className="jobs-toolbar-button jobs-toolbar-button-secondary" href={APP_ROUTES.internal.jobs.assigned}>
            Reset
          </Link>
        </form>

        <div className="jobs-table-wrap">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Job Title & ID</th>
                <th>Client Name</th>
                <th>Lead Recruiter</th>
                <th>Team</th>
                <th>Status</th>
                <th>Candidates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td className="jobs-table-empty" colSpan={7}>
                    No jobs found for current filters.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const jobID = String(job.id)
                  const recruiters = recruiterNamesByJobID.get(jobID) || []
                  const candidatesCount = candidatesCountByJobID.get(jobID) || 0

                  return (
                    <tr key={`job-row-${job.id}`}>
                      <td>
                        <p className="jobs-table-title">{job.title}</p>
                        <p className="jobs-table-subtitle">
                          ID: JOB-{job.id} • {job.location || 'Remote'} • {job.employmentType}
                        </p>
                      </td>
                      <td className="jobs-table-subtitle">{readLabel(job.client)}</td>
                      <td className="jobs-table-subtitle">{readLabel(job.owningHeadRecruiter, 'Unassigned')}</td>
                      <td>
                        <div className="jobs-team-stack">
                          {recruiters.length === 0 ? (
                            <span className="jobs-team-empty">--</span>
                          ) : (
                            recruiters.slice(0, 3).map((name, index) => (
                              <span className="jobs-team-avatar" key={`job-${job.id}-team-${name}-${index}`}>
                                {toInitials(name)}
                              </span>
                            ))
                          )}
                          {recruiters.length > 3 ? <span className="jobs-team-more">+{recruiters.length - 3}</span> : null}
                        </div>
                      </td>
                      <td>
                        <span className={`jobs-status-pill jobs-status-pill-${job.status}`}>
                          {toStatusLabel(job.status)}
                        </span>
                      </td>
                      <td className="jobs-table-candidate-count">{candidatesCount}</td>
                      <td>
                        <div className="jobs-table-actions">
                          <Link className="jobs-row-action" href={`${APP_ROUTES.internal.jobs.detailBase}/${job.id}`}>
                            Open Board
                          </Link>
                          {canSourceCandidates ? (
                            <Link className="jobs-row-action jobs-row-action-secondary" href={`${APP_ROUTES.internal.candidates.new}?jobId=${job.id}`}>
                              Add Candidate
                            </Link>
                          ) : null}
                          <Link
                            className="jobs-row-action jobs-row-action-secondary"
                            href={user.role === 'admin' ? APP_ROUTES.internal.assignments.head : APP_ROUTES.internal.assignments.lead}
                          >
                            Reassign
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </article>

      <section className="jobs-foot-grid">
        <article className="jobs-foot-card">
          <h2>Recent Changes</h2>
          {stageHistory.docs.length === 0 ? (
            <p className="jobs-foot-empty">No recent activity.</p>
          ) : (
            <div className="jobs-change-list">
              {stageHistory.docs.map((item) => (
                <article className="jobs-change-item" key={`history-${item.id}`}>
                  <p className="jobs-change-title">
                    {readLabel(item.candidate)} moved to {APPLICATION_STAGE_LABELS[item.toStage]}
                  </p>
                  <p className="jobs-change-meta">
                    {readLabel(item.job)} • {toRelativeTime(item.changedAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="jobs-foot-card jobs-foot-card-tip">
          <h2>Recruitment Tip</h2>
          <p>
            You have {jobs.filter((job) => job.status === 'active' && (candidatesCountByJobID.get(String(job.id)) || 0) < 3).length}{' '}
            active jobs with fewer than 3 applications. Prioritize sourcing for those roles.
          </p>
          <Link href={APP_ROUTES.internal.applications.reviewQueue}>Open Priority Queue</Link>
        </article>
      </section>

      {isCreateModalOpen && canCreateJobs ? (
        <section className="jobs-modal-layer" role="dialog" aria-label="Create Job" aria-modal="true">
          <div className="jobs-modal-backdrop" />
          <article className="jobs-modal">
            <div className="jobs-modal-head">
              <div>
                <h2>Post New Job</h2>
                <p>Create a role intake and assign lead ownership.</p>
              </div>
              <Link className="jobs-modal-close" href={APP_ROUTES.internal.jobs.assigned}>
                ✕
              </Link>
            </div>

            {clientsResult.docs.length === 0 ? (
              <div className="jobs-modal-empty">
                <p>No active clients available in your current visibility scope.</p>
                <Link href={APP_ROUTES.internal.clients.list}>Create Client First</Link>
              </div>
            ) : (
            <form action={APP_ROUTES.internal.jobs.create} className="jobs-modal-form" method="post">
              <div className="jobs-modal-grid">
                <label className="jobs-modal-field" htmlFor="create-job-client">
                  <span>Client</span>
                  <select defaultValue="" id="create-job-client" name="clientId" required>
                    <option value="">Select client</option>
                    {clientsResult.docs.map((client) => (
                      <option key={`create-job-client-${client.id}`} value={String(client.id)}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="jobs-modal-field" htmlFor="create-job-title">
                  <span>Job Title</span>
                  <input id="create-job-title" name="title" placeholder="e.g. Senior UX Designer" required type="text" />
                </label>
              </div>

              <div className="jobs-modal-grid">
                <label className="jobs-modal-field" htmlFor="create-job-department">
                  <span>Department</span>
                  <input id="create-job-department" name="department" placeholder="e.g. Product Design" type="text" />
                </label>
                <label className="jobs-modal-field" htmlFor="create-job-employment-type">
                  <span>Employment Type</span>
                  <select defaultValue="fullTime" id="create-job-employment-type" name="employmentType" required>
                    {JOB_EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                      <option key={`create-job-employment-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="jobs-modal-grid">
                <label className="jobs-modal-field" htmlFor="create-job-location">
                  <span>Location</span>
                  <input id="create-job-location" name="location" placeholder="e.g. Bengaluru / Remote" type="text" />
                </label>
                <label className="jobs-modal-field" htmlFor="create-job-openings">
                  <span>Openings</span>
                  <input defaultValue={1} id="create-job-openings" min={1} name="openings" type="number" />
                </label>
              </div>

              <div className="jobs-modal-grid">
                {user.role === 'admin' ? (
                  <label className="jobs-modal-field" htmlFor="create-job-lead">
                    <span>Lead Recruiter</span>
                    <select defaultValue="" id="create-job-lead" name="leadRecruiterId" required>
                      <option value="">Select lead</option>
                      {leadsOptions.map((lead) => (
                        <option key={`create-job-lead-${lead.id}`} value={String(lead.id)}>
                          {lead.fullName || lead.email}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <input name="leadRecruiterId" type="hidden" value={String(user.id)} />
                )}

                <label className="jobs-modal-field" htmlFor="create-job-priority">
                  <span>Priority</span>
                  <select defaultValue="medium" id="create-job-priority" name="priority">
                    {JOB_PRIORITY_OPTIONS.map((option) => (
                      <option key={`create-job-priority-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="jobs-modal-grid">
                <label className="jobs-modal-field" htmlFor="create-job-status">
                  <span>Status</span>
                  <select defaultValue="active" id="create-job-status" name="status">
                    {CREATE_JOB_STATUS_OPTIONS.map((option) => (
                      <option key={`create-job-status-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="jobs-modal-field" htmlFor="create-job-target">
                  <span>Target Closure Date</span>
                  <input defaultValue={toISODate(new Date())} id="create-job-target" name="targetClosureDate" type="date" />
                </label>
              </div>

              <div className="jobs-modal-grid">
                <label className="jobs-modal-field" htmlFor="create-job-experience-min">
                  <span>Experience Min (Years)</span>
                  <input id="create-job-experience-min" min={0} name="experienceMin" type="number" />
                </label>
                <label className="jobs-modal-field" htmlFor="create-job-experience-max">
                  <span>Experience Max (Years)</span>
                  <input id="create-job-experience-max" min={0} name="experienceMax" type="number" />
                </label>
              </div>

              <div className="jobs-modal-grid">
                <label className="jobs-modal-field" htmlFor="create-job-salary-min">
                  <span>Salary Min</span>
                  <input id="create-job-salary-min" min={0} name="salaryMin" type="number" />
                </label>
                <label className="jobs-modal-field" htmlFor="create-job-salary-max">
                  <span>Salary Max</span>
                  <input id="create-job-salary-max" min={0} name="salaryMax" type="number" />
                </label>
              </div>

              <label className="jobs-modal-field" htmlFor="create-job-description">
                <span>Description</span>
                <textarea id="create-job-description" name="description" required rows={4} />
              </label>

              <label className="jobs-modal-field" htmlFor="create-job-skills">
                <span>Required Skills</span>
                <textarea
                  id="create-job-skills"
                  name="requiredSkills"
                  placeholder="React, TypeScript, PostgreSQL"
                  rows={3}
                />
              </label>

              <div className="jobs-modal-footer">
                <Link className="jobs-modal-cancel" href={APP_ROUTES.internal.jobs.assigned}>
                  Cancel
                </Link>
                <button className="jobs-modal-submit" data-pending-label="Creating..." type="submit">
                  Create Job
                </button>
              </div>
            </form>
            )}
          </article>
        </section>
      ) : null}
    </section>
  )
}
