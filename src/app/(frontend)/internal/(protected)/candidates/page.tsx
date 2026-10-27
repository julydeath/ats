import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload, type Where } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { parseSkillQuery } from '@/lib/candidates/skills'
import {
  CANDIDATE_SOURCE_OPTIONS,
  CANDIDATE_SOURCES,
  type CandidateSource,
} from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import {
  formatAuditActorName,
  formatAuditActorRole,
  formatAuditDate,
} from '@/lib/utils/record-audit'
import { extractRelationshipID } from '@/lib/utils/relationships'

const SOURCE_LABELS = new Map(
  CANDIDATE_SOURCE_OPTIONS.map((option) => [option.value, option.label]),
)
const PAGE_SIZE = 10

type CandidatesListPageProps = {
  searchParams?: Promise<{
    client?: string
    expMax?: string
    expMin?: string
    page?: string
    q?: string
    skills?: string
    source?: string
  }>
}

type ListFilters = {
  client: string
  expMax: string
  expMin: string
  q: string
  skills: string
  source: string
}

const toDisplayText = (value: unknown, fallback: string = ''): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : fallback
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

const getInitials = (value: unknown, fallback: string = 'NA'): string => {
  const text = toDisplayText(value)
  if (!text) {
    return fallback
  }

  return text
    .split(' ')
    .map((item) => item[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const getRelativeDate = (value: string): string => {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()

  if (Number.isNaN(date.getTime()) || diffMs < 0) {
    return 'Updated recently'
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) {
    return 'Updated just now'
  }

  if (hours < 24) {
    return `Updated ${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `Updated ${days}d ago`
  }

  const months = Math.floor(days / 30)
  return `Updated ${months}mo ago`
}

const isCandidateSource = (value: string): value is CandidateSource =>
  CANDIDATE_SOURCES.includes(value as CandidateSource)

const getSourceLabel = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Unknown'
  }

  if (isCandidateSource(value)) {
    return SOURCE_LABELS.get(value) || value
  }

  return value
}

const readYears = (value: string | undefined): string => {
  const years = Number.parseFloat(String(value || '').trim())
  return Number.isFinite(years) && years >= 0 && years <= 50 ? String(years) : ''
}

const buildQuery = (filters: ListFilters, page: number): string => {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })

  if (page > 1) {
    params.set('page', String(page))
  }

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

export default async function CandidatesListPage({ searchParams }: CandidatesListPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const filters: ListFilters = {
    client: (resolvedSearchParams.client || '').trim(),
    expMax: readYears(resolvedSearchParams.expMax),
    expMin: readYears(resolvedSearchParams.expMin),
    q: (resolvedSearchParams.q || '').trim(),
    skills: (resolvedSearchParams.skills || '').trim(),
    source: (resolvedSearchParams.source || '').trim(),
  }
  const requestedPage = Number.parseInt(String(resolvedSearchParams.page || '1'), 10)
  const canCreateCandidate =
    user.role === 'admin' || user.role === 'leadRecruiter' || user.role === 'recruiter'
  const canCreateApplication = user.role === 'admin' || user.role === 'leadRecruiter'
  const canEditCandidate = user.role === 'admin' || user.role === 'leadRecruiter'
  const skillKeys = parseSkillQuery(filters.skills)
  const conditions: Where[] = []

  if (filters.q) {
    conditions.push({
      or: [
        { fullName: { like: filters.q } },
        { email: { like: filters.q } },
        { phone: { like: filters.q } },
        { currentCompany: { like: filters.q } },
        { currentRole: { like: filters.q } },
        { skillsSearch: { like: filters.q } },
      ],
    })
  }

  // Candidate must have every requested skill (exact tag match, aliases normalized).
  skillKeys.forEach((skill) => {
    conditions.push({ skillsSearch: { contains: `|${skill}|` } })
  })

  if (filters.expMin) {
    conditions.push({ totalExperienceYears: { greater_than_equal: Number(filters.expMin) } })
  }

  if (filters.expMax) {
    conditions.push({ totalExperienceYears: { less_than_equal: Number(filters.expMax) } })
  }

  if (isCandidateSource(filters.source)) {
    conditions.push({ source: { equals: filters.source } })
  }

  if (/^\d+$/.test(filters.client)) {
    const clientApplications = await payload.find({
      collection: 'applications',
      depth: 0,
      limit: 2000,
      overrideAccess: false,
      pagination: false,
      select: {
        candidate: true,
      },
      user,
      where: {
        'job.client': {
          equals: Number(filters.client),
        },
      },
    })
    const clientCandidateIDs = clientApplications.docs
      .map((application) => extractRelationshipID(application.candidate))
      .filter((id): id is number | string => id !== null && id !== undefined)

    conditions.push({
      or: [
        { 'sourceJob.client': { equals: Number(filters.client) } },
        ...(clientCandidateIDs.length > 0 ? [{ id: { in: clientCandidateIDs } }] : []),
      ],
    })
  }

  const [candidatesResult, clientsResult, attentionResult] = await Promise.all([
    payload.find({
      collection: 'candidates',
      depth: 1,
      limit: PAGE_SIZE,
      overrideAccess: false,
      page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
      select: {
        candidateCode: true,
        createdAt: true,
        currentCompany: true,
        currentRole: true,
        email: true,
        fullName: true,
        id: true,
        phone: true,
        skills: true,
        source: true,
        sourceJob: true,
        sourcedBy: true,
        totalExperienceMonths: true,
        totalExperienceYears: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
      where: conditions.length > 0 ? { and: conditions } : undefined,
    }),
    payload.find({
      collection: 'clients',
      depth: 0,
      limit: 240,
      overrideAccess: false,
      pagination: false,
      select: {
        clientCode: true,
        id: true,
        name: true,
      },
      sort: 'name',
      user,
    }),
    canCreateCandidate
      ? payload.count({
          collection: 'candidate-resume-import-items',
          overrideAccess: false,
          user,
          where: {
            and: [
              { uploadedBy: { equals: user.id } },
              { status: { equals: 'failed' } },
              { dismissedAt: { exists: false } },
              {
                createdAt: {
                  greater_than_equal: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                },
              },
            ],
          },
        })
      : Promise.resolve({ totalDocs: 0 }),
  ])

  const totalRows = candidatesResult.totalDocs
  const totalPages = Math.max(1, candidatesResult.totalPages)
  const currentPage = candidatesResult.page || 1
  const pagedRows = candidatesResult.docs
  const start = (currentPage - 1) * PAGE_SIZE
  const showingFrom = totalRows === 0 ? 0 : start + 1
  const showingTo = Math.min(start + PAGE_SIZE, totalRows)
  const failedUploads = attentionResult.totalDocs

  const leftPage = Math.max(1, currentPage - 1)
  const rightPage = Math.min(totalPages, currentPage + 1)

  return (
    <section className="candidate-mgmt-page">
      <header className="candidate-mgmt-header">
        <div className="candidate-mgmt-header-copy">
          <h1>Candidates</h1>
          <p>
            Manage your talent pool with clean sourcing data, searchable records, and quick access
            to profile actions.
          </p>
        </div>

        <div className="candidate-mgmt-header-actions">
          {canCreateCandidate ? (
            <Link
              className="candidate-mgmt-upload-card"
              href={APP_ROUTES.internal.candidates.importsNew}
            >
              <span className="candidate-mgmt-upload-icon">↑</span>
              <span>
                <strong>Bulk Resume Upload</strong>
                <small>Upload up to 10 resumes</small>
              </span>
            </Link>
          ) : null}

          {failedUploads > 0 ? (
            <Link
              className="candidate-mgmt-attention-link"
              href={`${APP_ROUTES.internal.candidates.importsNew}#needs-attention`}
            >
              {failedUploads} resume{failedUploads === 1 ? '' : 's'} failed to upload
            </Link>
          ) : null}

          {canCreateCandidate ? (
            <Link className="candidate-mgmt-add-button" href={APP_ROUTES.internal.candidates.new}>
              Add Candidate
            </Link>
          ) : null}
        </div>
      </header>

      <section className="candidate-mgmt-filter-card">
        <form className="candidate-mgmt-filters" method="get">
          <input
            aria-label="Skills"
            className="candidate-mgmt-search"
            defaultValue={filters.skills}
            name="skills"
            placeholder="Skills, comma separated (e.g. Java, Spring Boot)"
            type="search"
          />

          <input
            aria-label="Minimum years of experience"
            className="candidate-mgmt-select candidate-mgmt-exp-input"
            defaultValue={filters.expMin}
            inputMode="decimal"
            max={50}
            min={0}
            name="expMin"
            placeholder="Min yrs"
            step="0.5"
            type="number"
          />

          <input
            aria-label="Maximum years of experience"
            className="candidate-mgmt-select candidate-mgmt-exp-input"
            defaultValue={filters.expMax}
            inputMode="decimal"
            max={50}
            min={0}
            name="expMax"
            placeholder="Max yrs"
            step="0.5"
            type="number"
          />

          <input
            aria-label="Name, email, phone or company"
            className="candidate-mgmt-search"
            defaultValue={filters.q}
            name="q"
            placeholder="Name, email, phone, company..."
            type="search"
          />

          <select className="candidate-mgmt-select" defaultValue={filters.client} name="client">
            <option value="">Client</option>
            {clientsResult.docs.map((client) => (
              <option key={`candidate-client-${client.id}`} value={String(client.id)}>
                {client.clientCode || `CLT-${client.id}`} · {client.name}
              </option>
            ))}
          </select>

          <select className="candidate-mgmt-select" defaultValue={filters.source} name="source">
            <option value="">Source</option>
            {CANDIDATE_SOURCE_OPTIONS.map((sourceOption) => (
              <option key={`source-${sourceOption.value}`} value={sourceOption.value}>
                {sourceOption.label}
              </option>
            ))}
          </select>

          <button className="candidate-mgmt-filter-button" type="submit">
            Filter
          </button>

          <Link className="candidate-mgmt-reset-button" href={APP_ROUTES.internal.candidates.list}>
            Reset
          </Link>
        </form>
      </section>

      <section className="candidate-mgmt-table-card">
        <div className="candidate-mgmt-table-wrap">
          <table className="candidate-mgmt-table">
            <thead>
              <tr>
                <th>Candidate Name</th>
                <th>Skill &amp; Exp</th>
                <th>Current Company</th>
                <th>Contact Info</th>
                <th>Source</th>
                <th>Added By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td className="candidate-mgmt-empty" colSpan={7}>
                    No candidates found in this view.
                  </td>
                </tr>
              ) : (
                pagedRows.map((candidate) => {
                  const candidateName = toDisplayText(candidate.fullName, `Candidate ${candidate.id}`)
                  const currentRole = toDisplayText(candidate.currentRole)
                  const currentCompany = toDisplayText(candidate.currentCompany, 'Not provided')
                  const email = toDisplayText(candidate.email, 'No email')
                  const phone = toDisplayText(candidate.phone, 'No phone')
                  const sourceJobID = extractRelationshipID(candidate.sourceJob)
                  const years =
                    typeof candidate.totalExperienceYears === 'number'
                      ? candidate.totalExperienceYears
                      : null
                  const skills = Array.isArray(candidate.skills)
                    ? candidate.skills
                        .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
                        .filter((skill) => skill.length > 0)
                    : []
                  const months =
                    typeof candidate.totalExperienceMonths === 'number'
                      ? candidate.totalExperienceMonths
                      : 0
                  const experienceLabel =
                    years === null
                      ? 'Experience not added'
                      : `${years} yr${years === 1 ? '' : 's'}${months > 0 ? ` ${months} mo` : ''} experience`
                  const shownSkills = skills.slice(0, 3)
                  const extraSkillsCount = Math.max(skills.length - shownSkills.length, 0)
                  const sourceLabel = getSourceLabel(candidate.source)
                  const addedBy = formatAuditActorName(candidate.sourcedBy)
                  const addedByRole = formatAuditActorRole(candidate.sourcedBy)
                  const addedOn = formatAuditDate(candidate.createdAt)

                  return (
                    <tr key={`candidate-row-${candidate.id}`}>
                      <td>
                        <div className="candidate-mgmt-name-cell">
                          <span className="candidate-mgmt-avatar">
                            {getInitials(candidateName)}
                          </span>
                          <div>
                            <p className="candidate-mgmt-name">{candidateName}</p>
                            <p className="candidate-mgmt-sub">
                              {candidate.candidateCode || `CAN-${candidate.id}`} ·{' '}
                              {getRelativeDate(candidate.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="candidate-mgmt-skill-cell">
                          <div className="candidate-mgmt-skill-pills">
                            {shownSkills.length > 0 ? (
                              shownSkills.map((skill) => (
                                <span className="candidate-mgmt-skill-pill" key={`${candidate.id}-${skill}`}>
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="candidate-mgmt-skill-pill">
                                {currentRole || 'Skills not added'}
                              </span>
                            )}
                            {extraSkillsCount > 0 ? (
                              <span className="candidate-mgmt-skill-more">+{extraSkillsCount}</span>
                            ) : null}
                          </div>
                          <p>{experienceLabel}</p>
                        </div>
                      </td>

                      <td className="candidate-mgmt-company">
                        {currentCompany}
                      </td>

                      <td>
                        <div className="candidate-mgmt-contact">
                          <span>{email}</span>
                          <span>{phone}</span>
                        </div>
                      </td>

                      <td>
                        <span className="candidate-mgmt-source-pill">{sourceLabel}</span>
                      </td>

                      <td>
                        <div className="candidate-mgmt-contact">
                          <span>{addedBy}</span>
                          <span>
                            {addedByRole} · {addedOn}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="candidate-mgmt-row-actions">
                          <Link
                            className="candidate-mgmt-action-link"
                            href={`${APP_ROUTES.internal.candidates.detailBase}/${candidate.id}`}
                          >
                            Open
                          </Link>
                          {canEditCandidate ? (
                            <Link
                              className="candidate-mgmt-action-link candidate-mgmt-action-link-secondary"
                              href={`${APP_ROUTES.internal.candidates.editBase}/${candidate.id}/edit`}
                            >
                              Edit
                            </Link>
                          ) : null}
                          {canCreateApplication ? (
                            <Link
                              className="candidate-mgmt-action-link candidate-mgmt-action-link-secondary"
                              href={`${APP_ROUTES.internal.applications.new}?candidateId=${candidate.id}&jobId=${sourceJobID || ''}`}
                            >
                              Application
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="candidate-mgmt-pagination">
          <p>
            Showing {showingFrom} to {showingTo} of {totalRows} candidates
          </p>
          <div className="candidate-mgmt-page-controls">
            <Link
              aria-disabled={currentPage <= 1}
              className={`candidate-mgmt-page-btn ${currentPage <= 1 ? 'candidate-mgmt-page-btn-disabled' : ''}`}
              href={`${APP_ROUTES.internal.candidates.list}${buildQuery(filters, Math.max(currentPage - 1, 1))}`}
            >
              ‹
            </Link>

            <Link
              className={`candidate-mgmt-page-btn ${leftPage === currentPage ? 'candidate-mgmt-page-btn-active' : ''}`}
              href={`${APP_ROUTES.internal.candidates.list}${buildQuery(filters, leftPage)}`}
            >
              {leftPage}
            </Link>

            {rightPage !== leftPage ? (
              <Link
                className={`candidate-mgmt-page-btn ${rightPage === currentPage ? 'candidate-mgmt-page-btn-active' : ''}`}
                href={`${APP_ROUTES.internal.candidates.list}${buildQuery(filters, rightPage)}`}
              >
                {rightPage}
              </Link>
            ) : null}

            <Link
              aria-disabled={currentPage >= totalPages}
              className={`candidate-mgmt-page-btn ${currentPage >= totalPages ? 'candidate-mgmt-page-btn-disabled' : ''}`}
              href={`${APP_ROUTES.internal.candidates.list}${buildQuery(filters, Math.min(currentPage + 1, totalPages))}`}
            >
              ›
            </Link>
          </div>
        </footer>
      </section>
    </section>
  )
}
