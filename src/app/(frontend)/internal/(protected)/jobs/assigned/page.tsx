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

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Assigned Jobs</h1>
        <p className="muted">
          Visible jobs are filtered by assignment hierarchy for <strong>{INTERNAL_ROLE_LABELS[user.role]}</strong>.
        </p>
      </article>

      <article className="panel">
        <h2>Job List</h2>
        <ul>
          {jobs.docs.length === 0 ? (
            <li>No jobs available in your current assignment scope.</li>
          ) : (
            jobs.docs.map((job) => (
              <li key={`assigned-job-${job.id}`}>
                {job.title} | Client: {readLabel(job.client)} | Status: {job.status} | Priority:{' '}
                {job.priority} | Openings: {job.openings}
              </li>
            ))
          )}
        </ul>
      </article>
    </section>
  )
}
