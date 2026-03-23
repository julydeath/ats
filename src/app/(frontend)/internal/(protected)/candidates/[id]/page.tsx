import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
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
      email?: string
      fullName?: string
      name?: string
      title?: string
    }

    return typed.fullName || typed.title || typed.name || typed.email || fallback
  }

  return fallback
}

const getResumeURL = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const typed = value as { url?: unknown }
  return typeof typed.url === 'string' ? typed.url : null
}

type CandidateDetailPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    success?: string
  }>
}

export default async function CandidateDetailPage({ params, searchParams }: CandidateDetailPageProps) {
  const user = await requireInternalRole(['admin', 'headRecruiter', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}

  const candidateID = /^\d+$/.test(id) ? Number(id) : null

  if (!candidateID) {
    notFound()
  }

  try {
    const [candidate, applicationsForCandidate] = await Promise.all([
      payload.findByID({
        collection: 'candidates',
        depth: 1,
        id: candidateID,
        overrideAccess: false,
        select: {
          alternatePhone: true,
          candidateAccount: true,
          currentCompany: true,
          currentLocation: true,
          currentRole: true,
          email: true,
          expectedSalary: true,
          fullName: true,
          id: true,
          notes: true,
          noticePeriodDays: true,
          phone: true,
          resume: true,
          source: true,
          sourceDetails: true,
          sourceJob: true,
          sourcedBy: true,
          totalExperienceYears: true,
        },
        user,
      }),
      payload.find({
        collection: 'applications',
        depth: 1,
        limit: 50,
        pagination: false,
        overrideAccess: false,
        select: {
          id: true,
          job: true,
          recruiter: true,
          stage: true,
          updatedAt: true,
        },
        user,
        where: {
          candidate: {
            equals: candidateID,
          },
        },
      }),
    ])

    const resumeURL = getResumeURL(candidate.resume)
    const canCreateApplication = user.role === 'admin' || user.role === 'recruiter'
    const sourceJobID = extractRelationshipID(candidate.sourceJob)
    const hasContact = Boolean(candidate.email || candidate.phone)
    const readinessScore = [hasContact, Boolean(sourceJobID), Boolean(extractRelationshipID(candidate.resume))].filter(
      Boolean,
    ).length

    return (
      <section className="dashboard-grid">
        <article className="panel panel-span-2">
          <p className="eyebrow">Candidate Detail</p>
          <h1>{candidate.fullName}</h1>
          <p className="panel-intro">Master profile for external candidate. No job-specific stage is stored here.</p>
          {resolvedSearchParams.success ? <p className="muted small">Candidate created successfully.</p> : null}
          <div className="public-actions">
            <Link className="button button-secondary" href={APP_ROUTES.internal.candidates.list}>
              Back to Candidate Bank
            </Link>
            {canCreateApplication ? (
              <Link
                className="button"
                href={`${APP_ROUTES.internal.applications.new}?candidateId=${candidate.id}&jobId=${
                  sourceJobID || ''
                }`}
              >
                Create Application
              </Link>
            ) : null}
          </div>
        </article>

        <article className="panel">
          <h2>Readiness Snapshot</h2>
          <div className="kpi-grid">
            <div className="kpi-card">
              <p className="kpi-value">{readinessScore}/3</p>
              <p className="kpi-label">Profile Readiness</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-value">{applicationsForCandidate.docs.length}</p>
              <p className="kpi-label">Applications Created</p>
            </div>
          </div>
          <ul>
            <li>{hasContact ? 'Contact available' : 'Add phone or email'}</li>
            <li>{sourceJobID ? 'Source job linked' : 'Link source job'}</li>
            <li>{resumeURL ? 'Resume uploaded' : 'Upload resume'}</li>
          </ul>
        </article>

        <article className="panel">
          <h2>Profile</h2>
          <p className="kanban-meta">Email: {candidate.email || 'Not provided'}</p>
          <p className="kanban-meta">Phone: {candidate.phone || 'Not provided'}</p>
          <p className="kanban-meta">Alternate Phone: {candidate.alternatePhone || 'Not provided'}</p>
          <p className="kanban-meta">Location: {candidate.currentLocation || 'Not provided'}</p>
          <p className="kanban-meta">Current Company: {candidate.currentCompany || 'Not provided'}</p>
          <p className="kanban-meta">Current Role: {candidate.currentRole || 'Not provided'}</p>
          <p className="kanban-meta">Experience: {candidate.totalExperienceYears ?? 'Not provided'} years</p>
        </article>

        <article className="panel">
          <h2>Sourcing Context</h2>
          <p className="kanban-meta">Source: {candidate.source}</p>
          <p className="kanban-meta">Source Details: {candidate.sourceDetails || 'Not provided'}</p>
          <p className="kanban-meta">Source Job: {readLabel(candidate.sourceJob)}</p>
          <p className="kanban-meta">Sourced By: {readLabel(candidate.sourcedBy, 'System')}</p>
          <p className="kanban-meta">Expected Salary: {candidate.expectedSalary ?? 'Not provided'}</p>
          <p className="kanban-meta">Notice Period: {candidate.noticePeriodDays ?? 'Not provided'} days</p>
          <p className="kanban-meta">Notes: {candidate.notes || 'No notes added yet.'}</p>
          {resumeURL ? (
            <div className="public-actions">
              <a className="button button-secondary" href={resumeURL} rel="noreferrer" target="_blank">
                Open Resume
              </a>
            </div>
          ) : (
            <p className="kanban-meta">Resume: Not uploaded</p>
          )}
        </article>

        <article className="panel panel-span-2">
          <h2>Applications For This Candidate</h2>
          {applicationsForCandidate.docs.length === 0 ? (
            <p className="board-empty">No applications have been created for this candidate yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Recruiter</th>
                    <th>Stage</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applicationsForCandidate.docs.map((application) => (
                    <tr key={`candidate-application-${application.id}`}>
                      <td>{readLabel(application.job)}</td>
                      <td>{readLabel(application.recruiter)}</td>
                      <td>{application.stage}</td>
                      <td>{new Date(application.updatedAt).toLocaleString()}</td>
                      <td>
                        <Link
                          className="button button-secondary"
                          href={`${APP_ROUTES.internal.applications.detailBase}/${application.id}`}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    )
  } catch {
    notFound()
  }
}
