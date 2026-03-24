import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APPLICATION_STAGE_LABELS, type ApplicationStage } from '@/lib/constants/recruitment'
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
      filename?: string
      fullName?: string
      name?: string
      title?: string
    }

    return typed.fullName || typed.title || typed.name || typed.filename || typed.email || fallback
  }

  return fallback
}

const getResumeMeta = (value: unknown): { filename: string; mimeType: string; url: string | null } => {
  if (!value || typeof value !== 'object') {
    return {
      filename: 'Resume not uploaded',
      mimeType: '',
      url: null,
    }
  }

  const typed = value as {
    filename?: unknown
    mimeType?: unknown
    url?: unknown
  }

  return {
    filename: typeof typed.filename === 'string' && typed.filename.trim().length > 0 ? typed.filename : 'Resume file',
    mimeType: typeof typed.mimeType === 'string' ? typed.mimeType : '',
    url: typeof typed.url === 'string' ? typed.url : null,
  }
}

const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) {
    return 'Not set'
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return 'Not set'
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) {
    return 'Not set'
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return 'Not set'
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getSkillTags = (input: Array<string | null | undefined>): string[] => {
  const parts = input
    .flatMap((item) => (item || '').split(/[,\n/|]/g))
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 12)

  const unique = Array.from(new Set(parts))
  return unique.slice(0, 8)
}

const stageToneClass = (stage: ApplicationStage | null): string => {
  if (!stage) {
    return 'candidate-profile-status-neutral'
  }

  if (stage === 'internalReviewApproved' || stage === 'candidateApplied') {
    return 'candidate-profile-status-good'
  }

  if (stage === 'internalReviewPending' || stage === 'candidateInvited') {
    return 'candidate-profile-status-warn'
  }

  if (stage === 'internalReviewRejected' || stage === 'sentBackForCorrection') {
    return 'candidate-profile-status-bad'
  }

  return 'candidate-profile-status-neutral'
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
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
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
          currentCompany: true,
          currentLocation: true,
          currentRole: true,
          email: true,
          expectedSalary: true,
          fullName: true,
          id: true,
          linkedInURL: true,
          notes: true,
          noticePeriodDays: true,
          phone: true,
          portfolioURL: true,
          resume: true,
          source: true,
          sourceDetails: true,
          sourceJob: true,
          sourcedBy: true,
          skills: true,
          totalExperienceYears: true,
          updatedAt: true,
        },
        user,
      }),
      payload.find({
        collection: 'applications',
        depth: 1,
        limit: 60,
        pagination: false,
        overrideAccess: false,
        select: {
          id: true,
          job: true,
          latestComment: true,
          recruiter: true,
          stage: true,
          updatedAt: true,
        },
        sort: '-updatedAt',
        user,
        where: {
          candidate: {
            equals: candidateID,
          },
        },
      }),
    ])

    const resumeMeta = getResumeMeta(candidate.resume)
    const canCreateApplication = user.role === 'admin' || user.role === 'leadRecruiter' || user.role === 'recruiter'
    const sourceJobID = extractRelationshipID(candidate.sourceJob)
    const latestApplication = applicationsForCandidate.docs[0] || null
    const latestStage = (latestApplication?.stage as ApplicationStage | undefined) || null
    const latestStageLabel = latestStage ? APPLICATION_STAGE_LABELS[latestStage] : 'Profile Created'
    const skillTags = getSkillTags([
      ...(Array.isArray(candidate.skills) ? candidate.skills : []),
      candidate.currentRole,
      candidate.sourceDetails,
      candidate.notes,
      candidate.currentCompany,
    ])

    const timelineEntries = [
      {
        body: `${candidate.currentRole || 'Role not specified'} at ${candidate.currentCompany || 'Current company not provided'}`,
        date: `${candidate.totalExperienceYears ?? 0}+ years`,
        title: 'Current Position',
      },
      {
        body: `Sourced from ${String(candidate.source || 'Unknown source')} for ${readLabel(candidate.sourceJob, 'Source job not linked')}`,
        date: formatDate(candidate.updatedAt),
        title: 'Candidate Profile Updated',
      },
      ...applicationsForCandidate.docs.slice(0, 4).map((application) => ({
        body: `${APPLICATION_STAGE_LABELS[application.stage as ApplicationStage]} · Recruiter ${readLabel(application.recruiter)}`,
        date: formatDateTime(application.updatedAt),
        title: readLabel(application.job),
      })),
    ]

    return (
      <section className="candidate-profile-page">
        <header className="candidate-profile-hero">
          <div className="candidate-profile-hero-copy">
            <p className="candidate-profile-breadcrumb">Candidates &gt; {candidate.fullName}</p>
            <div className="candidate-profile-title-row">
              <h1>{candidate.fullName}</h1>
              <span className={`candidate-profile-status ${stageToneClass(latestStage)}`}>{latestStageLabel}</span>
            </div>
            <p className="candidate-profile-meta-line">
              {candidate.currentRole || 'Role not specified'} · {candidate.currentLocation || 'Location not provided'} ·{' '}
              {candidate.totalExperienceYears ?? 'N/A'} years experience
            </p>
            {resolvedSearchParams.success ? <p className="candidate-profile-success">Candidate profile saved successfully.</p> : null}
          </div>

          <div className="candidate-profile-hero-actions">
            {candidate.email ? (
              <a className="candidate-profile-action" href={`mailto:${candidate.email}`}>
                Send Email
              </a>
            ) : (
              <button className="candidate-profile-action candidate-profile-action-disabled" disabled type="button">
                Send Email
              </button>
            )}

            {latestApplication ? (
              <Link className="candidate-profile-action" href={`${APP_ROUTES.internal.applications.detailBase}/${latestApplication.id}`}>
                Update Status
              </Link>
            ) : (
              <button className="candidate-profile-action candidate-profile-action-disabled" disabled type="button">
                Update Status
              </button>
            )}

            {canCreateApplication ? (
              <Link
                className="candidate-profile-action candidate-profile-action-primary"
                href={`${APP_ROUTES.internal.applications.new}?candidateId=${candidate.id}&jobId=${sourceJobID || ''}`}
              >
                Invite to Job
              </Link>
            ) : null}
          </div>
        </header>

        <div className="candidate-profile-grid">
          <aside className="candidate-profile-left-col">
            <article className="candidate-profile-card">
              <p className="candidate-profile-card-title">Personal Details</p>
              <div className="candidate-profile-detail-list">
                <div className="candidate-profile-detail-item">
                  <span className="candidate-profile-detail-icon">@</span>
                  <div>
                    <p className="candidate-profile-detail-label">Email</p>
                    <p className="candidate-profile-detail-value">{candidate.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="candidate-profile-detail-item">
                  <span className="candidate-profile-detail-icon">☎</span>
                  <div>
                    <p className="candidate-profile-detail-label">Phone</p>
                    <p className="candidate-profile-detail-value">{candidate.phone || candidate.alternatePhone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="candidate-profile-detail-item">
                  <span className="candidate-profile-detail-icon">⌂</span>
                  <div>
                    <p className="candidate-profile-detail-label">Location</p>
                    <p className="candidate-profile-detail-value">{candidate.currentLocation || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="candidate-profile-card">
              <p className="candidate-profile-card-title">Core Competencies</p>
              {skillTags.length === 0 ? (
                <p className="candidate-profile-empty">No skills captured yet.</p>
              ) : (
                <div className="candidate-profile-skill-wrap">
                  {skillTags.map((tag, index) => (
                    <span className="candidate-profile-skill-tag" key={`skill-${index + 1}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>

            <article className="candidate-profile-card">
              <div className="candidate-profile-card-head">
                <p className="candidate-profile-card-title">Active Applications</p>
                <span>{applicationsForCandidate.docs.length} total</span>
              </div>
              {applicationsForCandidate.docs.length === 0 ? (
                <p className="candidate-profile-empty">No mapped applications yet.</p>
              ) : (
                <div className="candidate-profile-application-list">
                  {applicationsForCandidate.docs.slice(0, 4).map((application) => (
                    <article className="candidate-profile-application-item" key={`candidate-application-${application.id}`}>
                      <div>
                        <p>{readLabel(application.job)}</p>
                        <small>{formatDateTime(application.updatedAt)}</small>
                      </div>
                      <span>{APPLICATION_STAGE_LABELS[application.stage as ApplicationStage]}</span>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </aside>

          <div className="candidate-profile-main-col">
            <article className="candidate-profile-resume-card">
              <div className="candidate-profile-resume-head">
                <p>{resumeMeta.filename}</p>
                {resumeMeta.url ? (
                  <a href={resumeMeta.url} rel="noreferrer" target="_blank">
                    Download
                  </a>
                ) : (
                  <span>No file</span>
                )}
              </div>
              <div className="candidate-profile-resume-body">
                {resumeMeta.url && resumeMeta.mimeType === 'application/pdf' ? (
                  <iframe src={resumeMeta.url} title="Candidate Resume Preview" />
                ) : resumeMeta.url ? (
                  <div className="candidate-profile-resume-placeholder">
                    <p>Preview is not available for this file type.</p>
                    <a href={resumeMeta.url} rel="noreferrer" target="_blank">
                      Open Resume
                    </a>
                  </div>
                ) : (
                  <div className="candidate-profile-resume-placeholder">
                    <p>Resume is not uploaded for this candidate.</p>
                  </div>
                )}
              </div>
            </article>

            <article className="candidate-profile-card candidate-profile-timeline-card">
              <p className="candidate-profile-card-title">Professional Journey</p>
              <div className="candidate-profile-timeline">
                {timelineEntries.map((entry, index) => (
                  <article className="candidate-profile-timeline-item" key={`timeline-${index + 1}`}>
                    <span className="candidate-profile-timeline-dot" />
                    <div>
                      <p className="candidate-profile-timeline-date">{entry.date}</p>
                      <p className="candidate-profile-timeline-title">{entry.title}</p>
                      <p className="candidate-profile-timeline-body">{entry.body}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="candidate-profile-links">
                <Link className="candidate-profile-link" href={APP_ROUTES.internal.candidates.list}>
                  Back to Candidate List
                </Link>
                {candidate.linkedInURL ? (
                  <a className="candidate-profile-link" href={candidate.linkedInURL} rel="noreferrer" target="_blank">
                    LinkedIn
                  </a>
                ) : null}
                {candidate.portfolioURL ? (
                  <a className="candidate-profile-link" href={candidate.portfolioURL} rel="noreferrer" target="_blank">
                    Portfolio
                  </a>
                ) : null}
              </div>
            </article>
          </div>
        </div>
      </section>
    )
  } catch {
    notFound()
  }
}
