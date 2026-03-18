import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
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

export default async function AssignedJobsPage() {
  const user = await requireInternalRole(['admin', 'headRecruiter', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })

  const jobs = await payload.find({
    collection: 'jobs',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    sort: '-updatedAt',
    user,
    where: {
      status: {
        in: ['active', 'onHold'],
      },
    },
  })

  const activeJobs = jobs.docs.filter((job) => job.status === 'active')
  const onHoldJobs = jobs.docs.filter((job) => job.status === 'onHold')

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Assigned Jobs</h1>
        <p className="muted">
          Visible jobs are filtered by assignment hierarchy for <strong>{INTERNAL_ROLE_LABELS[user.role]}</strong>.
        </p>
      </article>

      <article className="panel panel-span-2">
        <h2>Jobs Board</h2>
        <div className="kanban-board">
          <section className="kanban-column">
            <header className="kanban-column-header">
              <h3>Active</h3>
              <span className="kanban-count">{activeJobs.length}</span>
            </header>
            <div className="kanban-cards">
              {activeJobs.length === 0 ? (
                <p className="board-empty">No active jobs in your current assignment scope.</p>
              ) : (
                activeJobs.map((job) => (
                  <article className="kanban-card" key={`active-assigned-job-${job.id}`}>
                    <p className="kanban-title">{job.title}</p>
                    <p className="kanban-meta">Client: {readLabel(job.client)}</p>
                    <p className="kanban-meta">Priority: {job.priority}</p>
                    <p className="kanban-meta">Openings: {job.openings}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="kanban-column">
            <header className="kanban-column-header">
              <h3>On Hold</h3>
              <span className="kanban-count">{onHoldJobs.length}</span>
            </header>
            <div className="kanban-cards">
              {onHoldJobs.length === 0 ? (
                <p className="board-empty">No on-hold jobs in your current assignment scope.</p>
              ) : (
                onHoldJobs.map((job) => (
                  <article className="kanban-card" key={`on-hold-assigned-job-${job.id}`}>
                    <p className="kanban-title">{job.title}</p>
                    <p className="kanban-meta">Client: {readLabel(job.client)}</p>
                    <p className="kanban-meta">Priority: {job.priority}</p>
                    <p className="kanban-meta">Openings: {job.openings}</p>
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
