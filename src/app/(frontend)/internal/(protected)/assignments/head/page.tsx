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
      name?: string
      fullName?: string
      title?: string
      email?: string
    }

    return typed.name || typed.fullName || typed.title || typed.email || fallback
  }

  return fallback
}

const readID = (value: unknown): string => {
  const id = extractRelationshipID(value)
  return id ? String(id) : ''
}

type HeadAssignmentsPageProps = {
  searchParams?: Promise<{
    error?: string
    success?: string
  }>
}

export default async function HeadAssignmentsPage({ searchParams }: HeadAssignmentsPageProps) {
  const user = await requireInternalRole(['admin'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}

  const [clientAssignments, jobAssignments, clients, jobs, leads] = await Promise.all([
    payload.find({
      collection: 'client-lead-assignments',
      depth: 1,
      limit: 120,
      pagination: false,
      overrideAccess: false,
      select: {
        client: true,
        id: true,
        leadRecruiter: true,
        notes: true,
        status: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'job-lead-assignments',
      depth: 1,
      limit: 120,
      pagination: false,
      overrideAccess: false,
      select: {
        client: true,
        id: true,
        job: true,
        leadRecruiter: true,
        notes: true,
        status: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'clients',
      depth: 0,
      limit: 180,
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

  const activeClientAssignments = clientAssignments.docs.filter((assignment) => assignment.status === 'active')
  const inactiveClientAssignments = clientAssignments.docs.filter((assignment) => assignment.status !== 'active')
  const activeJobAssignments = jobAssignments.docs.filter((assignment) => assignment.status === 'active')
  const inactiveJobAssignments = jobAssignments.docs.filter((assignment) => assignment.status !== 'active')

  const uniqueLeadLoad = new Set(
    activeJobAssignments
      .map((assignment) => readID(assignment.leadRecruiter))
      .filter(Boolean),
  ).size

  const clientWithActiveAssignmentIDs = new Set(
    activeClientAssignments.map((assignment) => readID(assignment.client)).filter(Boolean),
  )
  const jobWithActiveAssignmentIDs = new Set(
    activeJobAssignments.map((assignment) => readID(assignment.job)).filter(Boolean),
  )

  const unassignedClients = clients.docs.filter(
    (client) => !clientWithActiveAssignmentIDs.has(String(client.id)),
  )
  const unassignedJobs = jobs.docs.filter((job) => !jobWithActiveAssignmentIDs.has(String(job.id)))

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <h1>Client and Job Lead Assignment Desk</h1>
        <p className="muted">
          This is your control surface for assigning and reassigning leads. Update assignee, status, and
          notes inline without leaving this screen.
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
              <p className="workflow-step-title">Assign every active client to a lead</p>
              <p className="workflow-step-desc">Start with unassigned active clients first.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">2</span>
            <div>
              <p className="workflow-step-title">Assign jobs for execution ownership</p>
              <p className="workflow-step-desc">Job assignment controls who can allocate recruiters.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">3</span>
            <div>
              <p className="workflow-step-title">Use manager tables for rebalancing</p>
              <p className="workflow-step-desc">Change lead, status, and notes from the same row.</p>
            </div>
          </div>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Assignment Snapshot</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <p className="kpi-value">{activeClientAssignments.length}</p>
            <p className="kpi-label">Active Client Assignments</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{activeJobAssignments.length}</p>
            <p className="kpi-label">Active Job Assignments</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{unassignedClients.length}</p>
            <p className="kpi-label">Unassigned Active Clients</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{unassignedJobs.length}</p>
            <p className="kpi-label">Unassigned Active Jobs</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{uniqueLeadLoad}</p>
            <p className="kpi-label">Leads Carrying Active Jobs</p>
          </div>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Create New Assignments</h2>
        <div className="split-grid">
          <form action="/internal/assignments/head/client" className="auth-form" method="post">
            <h3>Client to Lead</h3>
            <label className="form-field" htmlFor="clientId">
              Client
            </label>
            <select className="input" id="clientId" name="clientId" required>
              <option value="">Select a client</option>
              {clients.docs.map((client) => (
                <option key={`client-option-${client.id}`} value={String(client.id)}>
                  {client.name}
                </option>
              ))}
            </select>

            <label className="form-field" htmlFor="clientLeadRecruiterId">
              Lead Recruiter
            </label>
            <select className="input" id="clientLeadRecruiterId" name="leadRecruiterId" required>
              <option value="">Select lead recruiter</option>
              {leads.docs.map((lead) => (
                <option key={`lead-client-option-${lead.id}`} value={String(lead.id)}>
                  {lead.fullName || lead.email}
                </option>
              ))}
            </select>

            <label className="form-field" htmlFor="clientAssignmentStatus">
              Status
            </label>
            <select className="input" defaultValue="active" id="clientAssignmentStatus" name="status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <label className="form-field" htmlFor="clientNotes">
              Notes
            </label>
            <textarea className="input" id="clientNotes" name="notes" rows={3} />

            <button className="button" data-pending-label="Saving..." type="submit">
              Save Client Assignment
            </button>
          </form>

          <form action="/internal/assignments/head/job" className="auth-form" method="post">
            <h3>Job to Lead</h3>
            <label className="form-field" htmlFor="jobId">
              Job
            </label>
            <select className="input" id="jobId" name="jobId" required>
              <option value="">Select a job</option>
              {jobs.docs.map((job) => (
                <option key={`job-option-${job.id}`} value={String(job.id)}>
                  {job.title} | {readLabel(job.client)}
                </option>
              ))}
            </select>

            <label className="form-field" htmlFor="jobLeadRecruiterId">
              Lead Recruiter
            </label>
            <select className="input" id="jobLeadRecruiterId" name="leadRecruiterId" required>
              <option value="">Select lead recruiter</option>
              {leads.docs.map((lead) => (
                <option key={`lead-job-option-${lead.id}`} value={String(lead.id)}>
                  {lead.fullName || lead.email}
                </option>
              ))}
            </select>

            <label className="form-field" htmlFor="jobAssignmentStatus">
              Status
            </label>
            <select className="input" defaultValue="active" id="jobAssignmentStatus" name="status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <label className="form-field" htmlFor="jobNotes">
              Notes
            </label>
            <textarea className="input" id="jobNotes" name="notes" rows={3} />

            <button className="button" data-pending-label="Saving..." type="submit">
              Save Job Assignment
            </button>
          </form>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Client Assignment Manager</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Current Lead</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Reassign / Toggle</th>
              </tr>
            </thead>
            <tbody>
              {clientAssignments.docs.length === 0 ? (
                <tr>
                  <td colSpan={5}>No client assignments available.</td>
                </tr>
              ) : (
                clientAssignments.docs.map((assignment) => (
                  <tr key={`client-assignment-row-${assignment.id}`}>
                    <td>{readLabel(assignment.client)}</td>
                    <td>{readLabel(assignment.leadRecruiter)}</td>
                    <td>{assignment.status === 'active' ? 'Active' : 'Inactive'}</td>
                    <td>{new Date(assignment.updatedAt).toLocaleString()}</td>
                    <td>
                      <form action="/internal/assignments/head/client" className="row-form" method="post">
                        <input name="assignmentId" type="hidden" value={String(assignment.id)} />
                        <select
                          className="input table-input"
                          defaultValue={readID(assignment.leadRecruiter)}
                          name="leadRecruiterId"
                          required
                        >
                          <option value="">Select lead</option>
                          {leads.docs.map((lead) => (
                            <option key={`client-row-lead-${assignment.id}-${lead.id}`} value={String(lead.id)}>
                              {lead.fullName || lead.email}
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Job Assignment Manager</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Client</th>
                <th>Current Lead</th>
                <th>Status</th>
                <th>Reassign / Toggle</th>
              </tr>
            </thead>
            <tbody>
              {jobAssignments.docs.length === 0 ? (
                <tr>
                  <td colSpan={5}>No job assignments available.</td>
                </tr>
              ) : (
                jobAssignments.docs.map((assignment) => (
                  <tr key={`job-assignment-row-${assignment.id}`}>
                    <td>{readLabel(assignment.job)}</td>
                    <td>{readLabel(assignment.client)}</td>
                    <td>{readLabel(assignment.leadRecruiter)}</td>
                    <td>{assignment.status === 'active' ? 'Active' : 'Inactive'}</td>
                    <td>
                      <form action="/internal/assignments/head/job" className="row-form" method="post">
                        <input name="assignmentId" type="hidden" value={String(assignment.id)} />
                        <select
                          className="input table-input"
                          defaultValue={readID(assignment.leadRecruiter)}
                          name="leadRecruiterId"
                          required
                        >
                          <option value="">Select lead</option>
                          {leads.docs.map((lead) => (
                            <option key={`job-row-lead-${assignment.id}-${lead.id}`} value={String(lead.id)}>
                              {lead.fullName || lead.email}
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <h2>Inactive Client Assignments</h2>
        {inactiveClientAssignments.length === 0 ? (
          <p className="board-empty">No inactive client assignments.</p>
        ) : (
          <ul>
            {inactiveClientAssignments.slice(0, 8).map((assignment) => (
              <li key={`inactive-client-summary-${assignment.id}`}>
                {readLabel(assignment.client)} to {readLabel(assignment.leadRecruiter)}
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel">
        <h2>Inactive Job Assignments</h2>
        {inactiveJobAssignments.length === 0 ? (
          <p className="board-empty">No inactive job assignments.</p>
        ) : (
          <ul>
            {inactiveJobAssignments.slice(0, 8).map((assignment) => (
              <li key={`inactive-job-summary-${assignment.id}`}>
                {readLabel(assignment.job)} to {readLabel(assignment.leadRecruiter)}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}
