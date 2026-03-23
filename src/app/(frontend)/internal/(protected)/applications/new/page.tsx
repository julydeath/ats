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
    const typed = value as {
      name?: string
      title?: string
    }

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
  const user = await requireInternalRole(['admin', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const selectedCandidateID = resolvedSearchParams.candidateId || ''
  const selectedJobID = resolvedSearchParams.jobId || ''
  const isAdmin = user.role === 'admin'

  const [jobs, candidates, recruiters] = await Promise.all([
    payload.find({
      collection: 'jobs',
      depth: 1,
      limit: 120,
      pagination: false,
      overrideAccess: false,
      select: {
        client: true,
        id: true,
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
      collection: 'candidates',
      depth: 1,
      limit: 140,
      pagination: false,
      overrideAccess: false,
      select: {
        email: true,
        fullName: true,
        id: true,
        phone: true,
        resume: true,
        sourceJob: true,
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
  ])

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">Step 4: Create Application</p>
        <h1>Create Candidate to Job Mapping</h1>
        <p className="panel-intro">
          This creates the internal workflow record. It starts in sourced state and moves to review when
          submitted.
        </p>
        {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}
        <div className="public-actions">
          <Link className="button button-secondary" href={APP_ROUTES.internal.candidates.list}>
            Candidate Bank
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.internal.applications.list}>
            Applications
          </Link>
        </div>
      </article>

      <article className="panel">
        <h2>Submission Checklist</h2>
        <div className="workflow-steps">
          <div className="workflow-step">
            <span className="workflow-step-number">1</span>
            <div>
              <p className="workflow-step-title">Select candidate</p>
              <p className="workflow-step-desc">Candidate master record must exist first.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">2</span>
            <div>
              <p className="workflow-step-title">Select job</p>
              <p className="workflow-step-desc">Only visible/assigned jobs are shown.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">3</span>
            <div>
              <p className="workflow-step-title">Add recruiter note</p>
              <p className="workflow-step-desc">Help lead recruiter with quick evaluation context.</p>
            </div>
          </div>
        </div>
      </article>

      <article className="panel">
        <h2>Current Scope</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <p className="kpi-value">{candidates.docs.length}</p>
            <p className="kpi-label">Visible Candidates</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{jobs.docs.length}</p>
            <p className="kpi-label">Visible Jobs</p>
          </div>
          {isAdmin ? (
            <div className="kpi-card">
              <p className="kpi-value">{recruiters.docs.length}</p>
              <p className="kpi-label">Active Recruiters</p>
            </div>
          ) : null}
        </div>
      </article>

      <article className="panel panel-span-2">
        {jobs.docs.length === 0 || candidates.docs.length === 0 ? (
          <p className="board-empty">
            At least one visible candidate and one visible job are required to create an application.
          </p>
        ) : (
          <form action={APP_ROUTES.internal.applications.create} className="auth-form" method="post">
            <div className="split-grid">
              <div>
                <label className="form-field" htmlFor="candidateId">
                  Candidate
                </label>
                <select className="input" defaultValue={selectedCandidateID} id="candidateId" name="candidateId" required>
                  <option value="">Select candidate</option>
                  {candidates.docs.map((candidate) => (
                    <option key={`application-candidate-${candidate.id}`} value={candidate.id}>
                      {candidate.fullName} | {candidate.email || candidate.phone || 'No contact'}
                    </option>
                  ))}
                </select>

                <label className="form-field" htmlFor="jobId">
                  Job
                </label>
                <select className="input" defaultValue={selectedJobID} id="jobId" name="jobId" required>
                  <option value="">Select job</option>
                  {jobs.docs.map((job) => (
                    <option key={`application-job-${job.id}`} value={job.id}>
                      {job.title} | {readLabel(job.client)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                {isAdmin ? (
                  <>
                    <label className="form-field" htmlFor="recruiterId">
                      Recruiter
                    </label>
                    <select className="input" id="recruiterId" name="recruiterId" required>
                      <option value="">Select recruiter</option>
                      {recruiters.docs.map((recruiter) => (
                        <option key={`application-recruiter-${recruiter.id}`} value={recruiter.id}>
                          {recruiter.fullName || recruiter.email}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <input name="recruiterId" type="hidden" value={String(user.id)} />
                )}

                <label className="form-field" htmlFor="latestComment">
                  Recruiter Comment
                </label>
                <textarea
                  className="input"
                  id="latestComment"
                  name="latestComment"
                  placeholder="Short summary for review (skills, fit, availability)"
                  rows={4}
                />

                <label className="form-field" htmlFor="notes">
                  Notes
                </label>
                <textarea className="input" id="notes" name="notes" rows={4} />
              </div>
            </div>

            <button className="button" data-pending-label="Creating..." type="submit">
              Create Application
            </button>
          </form>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Candidate Quick Context</h2>
        <div className="kanban-cards">
          {candidates.docs.slice(0, 10).map((candidate) => (
            <article className="kanban-card" key={`new-app-candidate-${candidate.id}`}>
              <p className="kanban-title">{candidate.fullName}</p>
              <p className="kanban-meta">Source Job: {readLabel(candidate.sourceJob)}</p>
              <p className="kanban-meta">
                Resume: {extractRelationshipID(candidate.resume) ? 'Uploaded' : 'Not uploaded'}
              </p>
            </article>
          ))}
        </div>
      </article>
    </section>
  )
}
