import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as { name?: string; title?: string }
    return typed.title || typed.name || fallback
  }

  return fallback
}

type ApplicationsNewPageProps = {
  searchParams?: Promise<{
    candidateId?: string
    error?: string
    jobId?: string
  }>
}

export default async function ApplicationsNewPage({ searchParams }: ApplicationsNewPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const selectedCandidateID = String(resolvedSearchParams.candidateId || '')
  const selectedJobID = String(resolvedSearchParams.jobId || '')
  const canSelectRecruiter = user.role === 'admin' || user.role === 'leadRecruiter'

  const [jobsResult, candidatesResult, recruitersResult] = await Promise.all([
    payload.find({
      collection: 'jobs',
      depth: 0,
      limit: 150,
      pagination: false,
      overrideAccess: false,
      select: {
        client: true,
        id: true,
        location: true,
        priority: true,
        title: true,
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
      collection: 'candidates',
      depth: 0,
      limit: 200,
      pagination: false,
      overrideAccess: false,
      select: {
        email: true,
        fullName: true,
        id: true,
        phone: true,
        resume: true,
        skills: true,
        sourceJob: true,
        totalExperienceYears: true,
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
  ])

  const unresolvedClientIDs = Array.from(
    new Set(
      jobsResult.docs
        .map((job) => extractRelationshipID(job.client))
        .filter((id): id is number | string => typeof id === 'number' || typeof id === 'string')
        .map((id) => String(id)),
    ),
  )

  const fallbackClients =
    unresolvedClientIDs.length === 0
      ? { docs: [] as Array<{ id: number | string; name?: string }> }
      : await payload.find({
          collection: 'clients',
          depth: 0,
          limit: unresolvedClientIDs.length,
          overrideAccess: true,
          pagination: false,
          select: {
            id: true,
            name: true,
          },
          where: {
            id: {
              in: unresolvedClientIDs,
            },
          },
        })

  const clientNameByID = new Map(fallbackClients.docs.map((client) => [String(client.id), client.name || String(client.id)]))

  const jobs = jobsResult.docs.map((job) => {
    const clientID = extractRelationshipID(job.client)
    const clientLabel =
      typeof job.client === 'object'
        ? readLabel(job.client)
        : clientID
          ? clientNameByID.get(String(clientID)) || String(clientID)
          : 'Unknown'

    return {
      clientLabel,
      id: String(job.id),
      location: job.location || 'Location not specified',
      priority: String(job.priority || 'medium'),
      title: job.title,
    }
  })

  const candidates = candidatesResult.docs.map((candidate) => ({
    contact: candidate.email || candidate.phone || 'No contact',
    id: String(candidate.id),
    name: candidate.fullName,
    resumeUploaded: Boolean(extractRelationshipID(candidate.resume)),
    skills: Array.isArray(candidate.skills)
      ? candidate.skills
          .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
          .filter((skill) => skill.length > 0)
      : [],
    sourceJobID: extractRelationshipID(candidate.sourceJob),
    totalExperienceYears:
      typeof candidate.totalExperienceYears === 'number' ? candidate.totalExperienceYears : null,
  }))

  const normalizedJobID = jobs.some((job) => job.id === selectedJobID) ? selectedJobID : ''
  const normalizedCandidateID = candidates.some((candidate) => candidate.id === selectedCandidateID) ? selectedCandidateID : ''

  const missingCoreData =
    jobs.length === 0 ||
    candidates.length === 0 ||
    (canSelectRecruiter && recruitersResult.docs.length === 0)

  return (
    <section className="application-create-page">
      <header className="application-create-header">
        <div>
          <p className="application-create-kicker">Applications</p>
          <h1>Create Application Mapping</h1>
          <p>Link candidate to job with recruiter ownership before moving into review workflow.</p>
        </div>
        <div className="application-create-header-actions">
          <Link className="application-create-head-btn" href={APP_ROUTES.internal.candidates.list}>
            Candidate Bank
          </Link>
          <Link className="application-create-head-btn" href={APP_ROUTES.internal.applications.list}>
            Applications
          </Link>
        </div>
      </header>

      {resolvedSearchParams.error ? (
        <p className="application-create-feedback application-create-feedback-error">{resolvedSearchParams.error}</p>
      ) : null}

      <section className="application-create-kpis">
        <article>
          <p>Visible Candidates</p>
          <strong>{candidates.length}</strong>
        </article>
        <article>
          <p>Visible Jobs</p>
          <strong>{jobs.length}</strong>
        </article>
        <article>
          <p>Recruiters</p>
          <strong>{recruitersResult.docs.length}</strong>
        </article>
      </section>

      {missingCoreData ? (
        <article className="application-create-empty">
          {canSelectRecruiter && recruitersResult.docs.length === 0
            ? 'No active recruiters found. Add or activate a recruiter first.'
            : 'At least one visible candidate and one visible job are required to create an application mapping.'}
        </article>
      ) : (
        <form action={APP_ROUTES.internal.applications.create} className="application-create-form" method="post">
          <div className="application-create-grid">
            <section className="application-create-card">
              <h2>Application Details</h2>

              <label>
                <span>Candidate *</span>
                <select defaultValue={normalizedCandidateID} name="candidateId" required>
                  <option value="">Select candidate</option>
                  {candidates.map((candidate) => (
                    <option key={`candidate-option-${candidate.id}`} value={candidate.id}>
                      {candidate.name} | {candidate.contact}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Job *</span>
                <select defaultValue={normalizedJobID} name="jobId" required>
                  <option value="">Select job</option>
                  {jobs.map((job) => (
                    <option key={`job-option-${job.id}`} value={job.id}>
                      {job.title} | {job.clientLabel}
                    </option>
                  ))}
                </select>
              </label>

              {canSelectRecruiter ? (
                <label>
                  <span>Recruiter *</span>
                  <select name="recruiterId" required>
                    <option value="">Select recruiter</option>
                    {recruitersResult.docs.map((recruiter) => (
                      <option key={`recruiter-option-${recruiter.id}`} value={String(recruiter.id)}>
                        {recruiter.fullName || recruiter.email}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input name="recruiterId" type="hidden" value={String(user.id)} />
              )}

              <label>
                <span>Recruiter Comment</span>
                <textarea
                  name="latestComment"
                  placeholder="Short summary for lead review (fit, availability, strengths)"
                  rows={3}
                />
              </label>

              <label>
                <span>Internal Notes</span>
                <textarea name="notes" placeholder="Additional private notes for internal team" rows={3} />
              </label>
            </section>

            <aside className="application-create-card">
              <h2>Quick Context</h2>
              <div className="application-create-list">
                {candidates.slice(0, 8).map((candidate) => (
                  <article key={`candidate-preview-${candidate.id}`}>
                    <p>{candidate.name}</p>
                    <small>
                      {candidate.totalExperienceYears === null
                        ? 'Experience not set'
                        : `${candidate.totalExperienceYears}y exp`}
                    </small>
                    <small>
                      {candidate.skills.length > 0 ? candidate.skills.slice(0, 3).join(', ') : 'Skills not set'}
                    </small>
                    <small>{candidate.resumeUploaded ? 'Resume uploaded' : 'Resume missing'}</small>
                  </article>
                ))}
              </div>
            </aside>
          </div>

          <footer className="application-create-footer">
            <Link className="application-create-cancel" href={APP_ROUTES.internal.applications.list}>
              Cancel
            </Link>
            <button className="application-create-submit" data-pending-label="Creating..." type="submit">
              Create Application
            </button>
          </footer>
        </form>
      )}
    </section>
  )
}
