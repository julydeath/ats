import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'

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

type HeadAssignmentsPageProps = {
  searchParams?: Promise<{
    error?: string
    success?: string
  }>
}

export default async function HeadAssignmentsPage({ searchParams }: HeadAssignmentsPageProps) {
  const user = await requireInternalRole(['admin', 'headRecruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}

  const [clientAssignments, jobAssignments, clients, jobs, leads] = await Promise.all([
    payload.find({
      collection: 'client-lead-assignments',
      depth: 1,
      limit: 50,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'job-lead-assignments',
      depth: 1,
      limit: 50,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'clients',
      depth: 0,
      limit: 200,
      overrideAccess: false,
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
      limit: 200,
      overrideAccess: false,
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
      limit: 200,
      overrideAccess: false,
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

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Head Recruiter Assignments</h1>
        <p className="muted">
          Manage client and job allocations to Lead Recruiters from this internal portal.
        </p>
        {resolvedSearchParams.success ? <p className="muted small">Assignment saved successfully.</p> : null}
        {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}
      </article>

      <article className="panel">
        <h2>Assign Client to Lead</h2>
        <form action="/internal/assignments/head/client" className="auth-form" method="post">
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
            <option value="">Select a lead recruiter</option>
            {leads.docs.map((lead) => (
              <option key={`lead-client-option-${lead.id}`} value={String(lead.id)}>
                {lead.fullName || lead.email}
              </option>
            ))}
          </select>

          <label className="form-field" htmlFor="clientNotes">
            Notes (optional)
          </label>
          <textarea className="input" id="clientNotes" name="notes" rows={3} />

          <button className="button" type="submit">
            Save Client Assignment
          </button>
        </form>
      </article>

      <article className="panel">
        <h2>Assign Job to Lead</h2>
        <form action="/internal/assignments/head/job" className="auth-form" method="post">
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
            <option value="">Select a lead recruiter</option>
            {leads.docs.map((lead) => (
              <option key={`lead-job-option-${lead.id}`} value={String(lead.id)}>
                {lead.fullName || lead.email}
              </option>
            ))}
          </select>

          <label className="form-field" htmlFor="jobNotes">
            Notes (optional)
          </label>
          <textarea className="input" id="jobNotes" name="notes" rows={3} />

          <button className="button" type="submit">
            Save Job Assignment
          </button>
        </form>
      </article>

      <article className="panel panel-span-2">
        <h2>Client Assignment Board</h2>
        <div className="kanban-board">
          <section className="kanban-column">
            <header className="kanban-column-header">
              <h3>Active</h3>
              <span className="kanban-count">{activeClientAssignments.length}</span>
            </header>
            <div className="kanban-cards">
              {activeClientAssignments.length === 0 ? (
                <p className="board-empty">No active client assignments.</p>
              ) : (
                activeClientAssignments.map((assignment) => (
                  <article className="kanban-card" key={`active-client-assignment-${assignment.id}`}>
                    <p className="kanban-title">{readLabel(assignment.client)}</p>
                    <p className="kanban-meta">Lead: {readLabel(assignment.leadRecruiter)}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="kanban-column">
            <header className="kanban-column-header">
              <h3>Inactive</h3>
              <span className="kanban-count">{inactiveClientAssignments.length}</span>
            </header>
            <div className="kanban-cards">
              {inactiveClientAssignments.length === 0 ? (
                <p className="board-empty">No inactive client assignments.</p>
              ) : (
                inactiveClientAssignments.map((assignment) => (
                  <article className="kanban-card" key={`inactive-client-assignment-${assignment.id}`}>
                    <p className="kanban-title">{readLabel(assignment.client)}</p>
                    <p className="kanban-meta">Lead: {readLabel(assignment.leadRecruiter)}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Job Assignment Board</h2>
        <div className="kanban-board">
          <section className="kanban-column">
            <header className="kanban-column-header">
              <h3>Active</h3>
              <span className="kanban-count">{activeJobAssignments.length}</span>
            </header>
            <div className="kanban-cards">
              {activeJobAssignments.length === 0 ? (
                <p className="board-empty">No active job assignments.</p>
              ) : (
                activeJobAssignments.map((assignment) => (
                  <article className="kanban-card" key={`active-job-assignment-${assignment.id}`}>
                    <p className="kanban-title">{readLabel(assignment.job)}</p>
                    <p className="kanban-meta">Lead: {readLabel(assignment.leadRecruiter)}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="kanban-column">
            <header className="kanban-column-header">
              <h3>Inactive</h3>
              <span className="kanban-count">{inactiveJobAssignments.length}</span>
            </header>
            <div className="kanban-cards">
              {inactiveJobAssignments.length === 0 ? (
                <p className="board-empty">No inactive job assignments.</p>
              ) : (
                inactiveJobAssignments.map((assignment) => (
                  <article className="kanban-card" key={`inactive-job-assignment-${assignment.id}`}>
                    <p className="kanban-title">{readLabel(assignment.job)}</p>
                    <p className="kanban-meta">Lead: {readLabel(assignment.leadRecruiter)}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </article>
    </section>
  )
}
