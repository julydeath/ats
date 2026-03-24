import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { extractRelationshipID } from '@/lib/utils/relationships'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as {
      fullName?: string
      name?: string
      title?: string
      email?: string
    }

    return typed.title || typed.fullName || typed.name || typed.email || fallback
  }

  return fallback
}

const readID = (value: unknown): string => {
  const id = extractRelationshipID(value)
  return id ? String(id) : ''
}

type LeadAssignmentsPageProps = {
  searchParams?: Promise<{
    error?: string
    success?: string
  }>
}

export default async function LeadAssignmentsPage({ searchParams }: LeadAssignmentsPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}

  const canCreateRecruiterAssignments = user.role === 'admin' || user.role === 'leadRecruiter'

  const [recruiterAssignments, recruiters, jobs, leads] = await Promise.all([
    payload.find({
      collection: 'recruiter-job-assignments',
      depth: 1,
      limit: 140,
      pagination: false,
      overrideAccess: false,
      select: {
        id: true,
        job: true,
        leadRecruiter: true,
        notes: true,
        recruiter: true,
        status: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 120,
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
              equals: 'recruiter',
            },
          },
          {
            isActive: {
              equals: true,
            },
          },
        ],
      },
    }),
    payload.find({
      collection: 'jobs',
      depth: 1,
      limit: 180,
      pagination: false,
      overrideAccess: false,
      select: {
        client: true,
        id: true,
        openings: true,
        priority: true,
        title: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
      where: {
        status: {
          in: ['active', 'onHold'],
        },
      },
    }),
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 120,
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
    }),
  ])

  const activeRecruiterAssignments = recruiterAssignments.docs.filter((assignment) => assignment.status === 'active')
  const inactiveRecruiterAssignments = recruiterAssignments.docs.filter(
    (assignment) => assignment.status !== 'active',
  )

  const activeAssignedJobIDs = new Set(
    activeRecruiterAssignments.map((assignment) => readID(assignment.job)).filter(Boolean),
  )
  const jobsWithoutRecruiters = jobs.docs.filter((job) => !activeAssignedJobIDs.has(String(job.id)))

  const activeRecruiterIDs = new Set(
    activeRecruiterAssignments.map((assignment) => readID(assignment.recruiter)).filter(Boolean),
  )

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <h1>Recruiter Work Allocation Desk</h1>
        <p className="muted">
          Assign recruiters, rebalance workloads, and deactivate stale mappings from a single screen.
        </p>
        {resolvedSearchParams.success ? <p className="muted small">Action saved successfully.</p> : null}
        {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}
      </article>

      <article className="panel">
        <h2>How To Use This Page</h2>
        <div className="workflow-steps">
          <div className="workflow-step">
            <span className="workflow-step-number">1</span>
            <div>
              <p className="workflow-step-title">Cover unassigned jobs first</p>
              <p className="workflow-step-desc">Every active job should have recruiter ownership.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">2</span>
            <div>
              <p className="workflow-step-title">Balance load across recruiters</p>
              <p className="workflow-step-desc">Avoid overloading one recruiter for multiple urgent jobs.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">3</span>
            <div>
              <p className="workflow-step-title">Update rows for quick reassignment</p>
              <p className="workflow-step-desc">Use inline update to reassign or deactivate stale mappings.</p>
            </div>
          </div>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Assignment Snapshot</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <p className="kpi-value">{activeRecruiterAssignments.length}</p>
            <p className="kpi-label">Active Recruiter Assignments</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{inactiveRecruiterAssignments.length}</p>
            <p className="kpi-label">Inactive Recruiter Assignments</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{jobsWithoutRecruiters.length}</p>
            <p className="kpi-label">Jobs Without Active Recruiter</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{activeRecruiterIDs.size}</p>
            <p className="kpi-label">Recruiters Currently Engaged</p>
          </div>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Create New Recruiter Assignment</h2>
        {canCreateRecruiterAssignments ? (
          <form action="/internal/assignments/lead/recruiter" className="auth-form" method="post">
            <div className="split-grid">
              <div>
                <label className="form-field" htmlFor="leadJobId">
                  Job
                </label>
                <select className="input" id="leadJobId" name="jobId" required>
                  <option value="">Select a job</option>
                  {jobs.docs.map((job) => (
                    <option key={`lead-job-option-${job.id}`} value={String(job.id)}>
                      {job.title} | {readLabel(job.client)}
                    </option>
                  ))}
                </select>

                {user.role === 'admin' ? (
                  <>
                    <label className="form-field" htmlFor="leadRecruiterId">
                      Lead Recruiter
                    </label>
                    <select className="input" id="leadRecruiterId" name="leadRecruiterId" required>
                      <option value="">Select a lead recruiter</option>
                      {leads.docs.map((lead) => (
                        <option key={`lead-option-${lead.id}`} value={String(lead.id)}>
                          {lead.fullName || lead.email}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>

              <div>
                <label className="form-field" htmlFor="recruiterId">
                  Recruiter
                </label>
                <select className="input" id="recruiterId" name="recruiterId" required>
                  <option value="">Select a recruiter</option>
                  {recruiters.docs.map((recruiter) => (
                    <option key={`recruiter-option-${recruiter.id}`} value={String(recruiter.id)}>
                      {recruiter.fullName || recruiter.email}
                    </option>
                  ))}
                </select>

                <label className="form-field" htmlFor="recruiterAssignmentStatus">
                  Status
                </label>
                <select className="input" defaultValue="active" id="recruiterAssignmentStatus" name="status">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <label className="form-field" htmlFor="recruiterJobNotes">
                  Notes
                </label>
                <textarea className="input" id="recruiterJobNotes" name="notes" rows={3} />
              </div>
            </div>

            <button className="button" data-pending-label="Saving..." type="submit">
              Save Recruiter Assignment
            </button>
          </form>
        ) : (
          <p className="muted">You can monitor assignments. Only Admin and Lead Recruiter can create/update.</p>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Recruiter Assignment Manager</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Recruiter</th>
                <th>Job</th>
                <th>Lead</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Reassign / Toggle</th>
              </tr>
            </thead>
            <tbody>
              {recruiterAssignments.docs.length === 0 ? (
                <tr>
                  <td colSpan={6}>No recruiter assignments found in your visibility scope.</td>
                </tr>
              ) : (
                recruiterAssignments.docs.map((assignment) => (
                  <tr key={`recruiter-assignment-row-${assignment.id}`}>
                    <td>{readLabel(assignment.recruiter)}</td>
                    <td>{readLabel(assignment.job)}</td>
                    <td>{readLabel(assignment.leadRecruiter)}</td>
                    <td>{assignment.status === 'active' ? 'Active' : 'Inactive'}</td>
                    <td>{new Date(assignment.updatedAt).toLocaleString()}</td>
                    <td>
                      {(user.role === 'admin' || user.role === 'leadRecruiter') ? (
                        <form action="/internal/assignments/lead/recruiter" className="row-form" method="post">
                          <input name="assignmentId" type="hidden" value={String(assignment.id)} />
                          <select
                            className="input table-input"
                            defaultValue={readID(assignment.recruiter)}
                            name="recruiterId"
                            required
                          >
                            <option value="">Select recruiter</option>
                            {recruiters.docs.map((recruiter) => (
                              <option
                                key={`row-recruiter-${assignment.id}-${recruiter.id}`}
                                value={String(recruiter.id)}
                              >
                                {recruiter.fullName || recruiter.email}
                              </option>
                            ))}
                          </select>
                          <select className="input table-input" defaultValue={assignment.status} name="status">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          <input
                            className="input table-input"
                            defaultValue={assignment.notes || ''}
                            name="notes"
                            placeholder="Notes"
                            type="text"
                          />
                          <button className="button button-secondary" data-pending-label="Saving..." type="submit">
                            Save
                          </button>
                        </form>
                      ) : (
                        <span className="muted small">Monitor-only access</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Jobs Needing Recruiter Assignment</h2>
        {jobsWithoutRecruiters.length === 0 ? (
          <p className="board-empty">Every visible job currently has at least one active recruiter assignment.</p>
        ) : (
          <div className="kanban-cards">
            {jobsWithoutRecruiters.slice(0, 12).map((job) => (
              <article className="kanban-card" key={`job-needs-recruiter-${job.id}`}>
                <p className="kanban-title">{job.title}</p>
                <p className="kanban-meta">Client: {readLabel(job.client)}</p>
                <p className="kanban-meta">Priority: {job.priority}</p>
                <p className="kanban-meta">Openings: {job.openings}</p>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
