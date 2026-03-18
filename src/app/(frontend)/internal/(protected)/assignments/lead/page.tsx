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
      fullName?: string
      name?: string
      title?: string
      email?: string
    }

    return typed.title || typed.fullName || typed.name || typed.email || fallback
  }

  return fallback
}

type LeadAssignmentsPageProps = {
  searchParams?: Promise<{
    error?: string
    success?: string
  }>
}

export default async function LeadAssignmentsPage({ searchParams }: LeadAssignmentsPageProps) {
  const user = await requireInternalRole(['admin', 'headRecruiter', 'leadRecruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}

  const canCreateRecruiterAssignments = user.role === 'admin' || user.role === 'leadRecruiter'

  const [recruiterAssignments, recruiters, jobs, leads] = await Promise.all([
    payload.find({
      collection: 'recruiter-job-assignments',
      depth: 2,
      limit: 75,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
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
  const activeRecruiterAssignments = recruiterAssignments.docs.filter((assignment) => assignment.status === 'active')
  const inactiveRecruiterAssignments = recruiterAssignments.docs.filter(
    (assignment) => assignment.status !== 'active',
  )

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Lead Recruiter Assignments</h1>
        <p className="muted">Assign recruiters to jobs within assignment scope from this internal portal.</p>
        {resolvedSearchParams.success ? <p className="muted small">Assignment saved successfully.</p> : null}
        {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}
      </article>

      <article className="panel">
        <h2>Assign Recruiter to Job</h2>
        {canCreateRecruiterAssignments ? (
          <form action="/internal/assignments/lead/recruiter" className="auth-form" method="post">
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

            <label className="form-field" htmlFor="recruiterJobNotes">
              Notes (optional)
            </label>
            <textarea className="input" id="recruiterJobNotes" name="notes" rows={3} />

            <button className="button" type="submit">
              Save Recruiter Assignment
            </button>
          </form>
        ) : (
          <p className="muted">You can monitor assignments here. Only Admin and Lead Recruiter can create them.</p>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Recruiter Assignment Board</h2>
        <div className="kanban-board">
          <section className="kanban-column">
            <header className="kanban-column-header">
              <h3>Active</h3>
              <span className="kanban-count">{activeRecruiterAssignments.length}</span>
            </header>
            <div className="kanban-cards">
              {activeRecruiterAssignments.length === 0 ? (
                <p className="board-empty">No active recruiter assignments in your scope.</p>
              ) : (
                activeRecruiterAssignments.map((assignment) => (
                  <article className="kanban-card" key={`active-recruiter-assignment-${assignment.id}`}>
                    <p className="kanban-title">{readLabel(assignment.recruiter)}</p>
                    <p className="kanban-meta">Job: {readLabel(assignment.job)}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="kanban-column">
            <header className="kanban-column-header">
              <h3>Inactive</h3>
              <span className="kanban-count">{inactiveRecruiterAssignments.length}</span>
            </header>
            <div className="kanban-cards">
              {inactiveRecruiterAssignments.length === 0 ? (
                <p className="board-empty">No inactive recruiter assignments in your scope.</p>
              ) : (
                inactiveRecruiterAssignments.map((assignment) => (
                  <article className="kanban-card" key={`inactive-recruiter-assignment-${assignment.id}`}>
                    <p className="kanban-title">{readLabel(assignment.recruiter)}</p>
                    <p className="kanban-meta">Job: {readLabel(assignment.job)}</p>
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
