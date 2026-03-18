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
      fullName?: string
      name?: string
      title?: string
      client?: unknown
    }

    return typed.title || typed.fullName || typed.name || fallback
  }

  return fallback
}

export default async function LeadAssignmentsPage() {
  const user = await requireInternalRole(['admin', 'headRecruiter', 'leadRecruiter'])
  const payload = await getPayload({ config: configPromise })

  const recruiterAssignments = await payload.find({
    collection: 'recruiter-job-assignments',
    depth: 2,
    limit: 75,
    overrideAccess: false,
    sort: '-updatedAt',
    user,
  })

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Lead Recruiter Assignments</h1>
        <p className="muted">
          Assign recruiters to jobs. Leads only see and manage assignments inside their permitted
          scope.
        </p>
        <div className="public-actions">
          <Link className="button" href={`${APP_ROUTES.payloadAdmin}/collections/recruiter-job-assignments/create`}>
            Assign Recruiter to Job
          </Link>
        </div>
      </article>

      <article className="panel">
        <h2>Recruiter to Job</h2>
        <ul>
          {recruiterAssignments.docs.length === 0 ? (
            <li>No recruiter assignments found for your scope.</li>
          ) : (
            recruiterAssignments.docs.map((assignment) => (
              <li key={`recruiter-assignment-${assignment.id}`}>
                {readLabel(assignment.recruiter)}
                {' -> '}
                {readLabel(assignment.job)} ({assignment.status})
              </li>
            ))
          )}
        </ul>
      </article>
    </section>
  )
}
