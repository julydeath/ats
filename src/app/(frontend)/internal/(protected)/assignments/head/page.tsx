import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'

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
    }

    return typed.name || typed.fullName || typed.title || fallback
  }

  return fallback
}

export default async function HeadAssignmentsPage() {
  const user = await requireInternalRole(['admin', 'headRecruiter'])
  const payload = await getPayload({ config: configPromise })

  const [clientAssignments, jobAssignments] = await Promise.all([
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
  ])

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Head Recruiter Assignments</h1>
        <p className="muted">
          Manage client and job allocations to Lead Recruiters. Access is restricted to Admin and
          Head Recruiter.
        </p>
        <div className="public-actions">
          <Link className="button" href={`${APP_ROUTES.payloadAdmin}/collections/client-lead-assignments/create`}>
            Assign Client to Lead
          </Link>
          <Link className="button button-secondary" href={`${APP_ROUTES.payloadAdmin}/collections/job-lead-assignments/create`}>
            Assign Job to Lead
          </Link>
        </div>
      </article>

      <article className="panel">
        <h2>Client to Lead</h2>
        <ul>
          {clientAssignments.docs.length === 0 ? (
            <li>No client assignments found.</li>
          ) : (
            clientAssignments.docs.map((assignment) => (
              <li key={`client-assignment-${assignment.id}`}>
                {readLabel(assignment.client)}
                {' -> '}
                {readLabel(assignment.leadRecruiter)} ({assignment.status})
              </li>
            ))
          )}
        </ul>
      </article>

      <article className="panel">
        <h2>Job to Lead</h2>
        <ul>
          {jobAssignments.docs.length === 0 ? (
            <li>No job assignments found.</li>
          ) : (
            jobAssignments.docs.map((assignment) => (
              <li key={`job-assignment-${assignment.id}`}>
                {readLabel(assignment.job)}
                {' -> '}
                {readLabel(assignment.leadRecruiter)} ({assignment.status})
              </li>
            ))
          )}
        </ul>
      </article>
    </section>
  )
}
