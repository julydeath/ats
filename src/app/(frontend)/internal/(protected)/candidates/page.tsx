import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { CANDIDATE_SOURCE_OPTIONS, CANDIDATE_SOURCES, type CandidateSource } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const SOURCE_LABELS = new Map(CANDIDATE_SOURCE_OPTIONS.map((option) => [option.value, option.label]))
const PAGE_SIZE = 10

type CandidatesListPageProps = {
  searchParams?: Promise<{
    client?: string
    exp?: string
    page?: string
    q?: string
    source?: string
  }>
}

const getInitials = (value: string): string =>
  value
    .split(' ')
    .map((item) => item[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

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

const normalize = (value: string) => value.trim().toLowerCase()

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

const getExperienceBucket = (years: number | null): 'junior' | 'mid' | 'senior' | 'unspecified' => {
  if (years === null) {
    return 'unspecified'
  }

  if (years >= 8) {
    return 'senior'
  }

  if (years >= 4) {
    return 'mid'
  }

  return 'junior'
}

const buildQuery = ({
  client,
  exp,
  page,
  q,
  source,
}: {
  client: string
  exp: string
  page: number
  q: string
  source: string
}): string => {
  const params = new URLSearchParams()

  if (q) {
    params.set('q', q)
  }

  if (client) {
    params.set('client', client)
  }

  if (exp) {
    params.set('exp', exp)
  }

  if (source) {
    params.set('source', source)
  }

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
  const searchTerm = (resolvedSearchParams.q || '').trim()
  const clientFilter = (resolvedSearchParams.client || '').trim()
  const sourceFilter = (resolvedSearchParams.source || '').trim()
  const expFilter = (resolvedSearchParams.exp || '').trim()
  const requestedPage = Number.parseInt(String(resolvedSearchParams.page || '1'), 10)
  const canCreateCandidate = user.role === 'admin' || user.role === 'leadRecruiter' || user.role === 'recruiter'
  const canCreateApplication = user.role === 'admin' || user.role === 'leadRecruiter'
  const canEditCandidate = user.role === 'admin' || user.role === 'leadRecruiter'

  const [candidatesResult, clientsResult] = await Promise.all([
    payload.find({
      collection: 'candidates',
      depth: 2,
      limit: 240,
      pagination: false,
      overrideAccess: false,
      select: {
        candidateCode: true,
        currentCompany: true,
        currentRole: true,
        email: true,
        fullName: true,
        id: true,
        phone: true,
        skills: true,
        source: true,
        sourceJob: true,
        totalExperienceYears: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
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
  ])
  const visibleCandidateIDs = candidatesResult.docs.map((candidate) => candidate.id)
  const applicationsForCandidates =
    visibleCandidateIDs.length === 0
      ? { docs: [] as Array<{ candidate?: unknown; job?: unknown }> }
      : await payload.find({
          collection: 'applications',
          depth: 2,
          limit: 600,
          overrideAccess: false,
          pagination: false,
          select: {
            candidate: true,
            job: true,
          },
          user,
          where: {
            candidate: {
              in: visibleCandidateIDs,
            },
          },
        })
  const applicationClientIDsByCandidateID = new Map<string, Set<string>>()

  applicationsForCandidates.docs.forEach((application) => {
    const candidateID = extractRelationshipID(application.candidate)
    const job = application.job as { client?: unknown } | number | string | null | undefined
    const clientID = typeof job === 'object' && job ? extractRelationshipID(job.client) : null

    if (!candidateID || !clientID) {
      return
    }

    const key = String(candidateID)
    const current = applicationClientIDsByCandidateID.get(key) || new Set<string>()
    current.add(String(clientID))
    applicationClientIDsByCandidateID.set(key, current)
  })

  const getCandidateClientIDs = (candidate: (typeof candidatesResult.docs)[number]): Set<string> => {
    const clientIDs = new Set<string>(applicationClientIDsByCandidateID.get(String(candidate.id)) || [])
    const sourceJob = candidate.sourceJob as { client?: unknown } | number | string | null | undefined
    const sourceJobClientID = typeof sourceJob === 'object' && sourceJob ? extractRelationshipID(sourceJob.client) : null

    if (sourceJobClientID) {
      clientIDs.add(String(sourceJobClientID))
    }

    return clientIDs
  }

  const filteredCandidates = candidatesResult.docs.filter((candidate) => {
    const searchable = [
      candidate.fullName,
      candidate.currentRole || '',
      Array.isArray(candidate.skills) ? candidate.skills.join(' ') : '',
      candidate.currentCompany || '',
      candidate.email || '',
      candidate.phone || '',
    ]
      .join(' ')
      .toLowerCase()

    const source = String(candidate.source || '')
    const bucket = getExperienceBucket(
      typeof candidate.totalExperienceYears === 'number' ? candidate.totalExperienceYears : null,
    )

    if (searchTerm && !searchable.includes(normalize(searchTerm))) {
      return false
    }

    if (sourceFilter && source !== sourceFilter) {
      return false
    }

    if (clientFilter && !getCandidateClientIDs(candidate).has(clientFilter)) {
      return false
    }

    if (expFilter && bucket !== expFilter) {
      return false
    }

    return true
  })

  const totalRows = filteredCandidates.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1
  const start = (currentPage - 1) * PAGE_SIZE
  const pagedRows = filteredCandidates.slice(start, start + PAGE_SIZE)
  const showingFrom = totalRows === 0 ? 0 : start + 1
  const showingTo = Math.min(start + PAGE_SIZE, totalRows)

  const leftPage = Math.max(1, currentPage - 1)
  const rightPage = Math.min(totalPages, currentPage + 1)

  return (
    <section className="candidate-mgmt-page">
      <header className="candidate-mgmt-header">
        <div className="candidate-mgmt-header-copy">
          <h1>Candidates</h1>
          <p>
            Manage your talent pool with clean sourcing data, searchable records, and quick access to profile actions.
          </p>
        </div>

        <div className="candidate-mgmt-header-actions">
          {canCreateCandidate ? (
            <Link className="candidate-mgmt-upload-card" href={APP_ROUTES.internal.candidates.new}>
              <span className="candidate-mgmt-upload-icon">↑</span>
              <span>
                <strong>Resume Upload</strong>
                <small>Drag & drop or browse files</small>
              </span>
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
            className="candidate-mgmt-search"
            defaultValue={searchTerm}
            name="q"
            placeholder="Search by name, skill, client, company, phone..."
            type="search"
          />

          <select className="candidate-mgmt-select" defaultValue={clientFilter} name="client">
            <option value="">Client</option>
            {clientsResult.docs.map((client) => (
              <option key={`candidate-client-${client.id}`} value={String(client.id)}>
                {client.clientCode || `CLT-${client.id}`} · {client.name}
              </option>
            ))}
          </select>

          <select className="candidate-mgmt-select" defaultValue={expFilter} name="exp">
            <option value="">Experience Level</option>
            <option value="senior">Senior (8+ years)</option>
            <option value="mid">Mid (4-7 years)</option>
            <option value="junior">Junior (0-3 years)</option>
            <option value="unspecified">Unspecified</option>
          </select>

          <select className="candidate-mgmt-select" defaultValue={sourceFilter} name="source">
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td className="candidate-mgmt-empty" colSpan={6}>
                    No candidates found in this view.
                  </td>
                </tr>
              ) : (
                pagedRows.map((candidate) => {
                  const sourceJobID = extractRelationshipID(candidate.sourceJob)
                  const years = typeof candidate.totalExperienceYears === 'number' ? candidate.totalExperienceYears : null
                  const skills = Array.isArray(candidate.skills)
                    ? candidate.skills
                        .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
                        .filter((skill) => skill.length > 0)
                    : []
                  const primarySkill = (skills[0] || candidate.currentRole || 'Generalist').toUpperCase()
                  const extraSkillsCount = Math.max(skills.length - 1, 0)
                  const sourceLabel = getSourceLabel(candidate.source)

                  return (
                    <tr key={`candidate-row-${candidate.id}`}>
                      <td>
                        <div className="candidate-mgmt-name-cell">
                          <span className="candidate-mgmt-avatar">{getInitials(candidate.fullName)}</span>
                          <div>
                            <p className="candidate-mgmt-name">{candidate.fullName}</p>
                            <p className="candidate-mgmt-sub">
                              {(candidate.candidateCode || `CAN-${candidate.id}`)} · {getRelativeDate(candidate.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="candidate-mgmt-skill-cell">
                          <span className="candidate-mgmt-skill-pill">{primarySkill}</span>
                          <p>
                            {extraSkillsCount > 0
                              ? `+${extraSkillsCount} additional skill${extraSkillsCount > 1 ? 's' : ''}`
                              : years === null
                                ? 'Experience not specified'
                                : `${years} Years Experience`}
                          </p>
                        </div>
                      </td>

                      <td className="candidate-mgmt-company">{candidate.currentCompany || 'Not provided'}</td>

                      <td>
                        <div className="candidate-mgmt-contact">
                          <span>{candidate.email || 'No email'}</span>
                          <span>{candidate.phone || 'No phone'}</span>
                        </div>
                      </td>

                      <td>
                        <span className="candidate-mgmt-source-pill">{sourceLabel}</span>
                      </td>

                      <td>
                        <div className="candidate-mgmt-row-actions">
                          <Link className="candidate-mgmt-action-link" href={`${APP_ROUTES.internal.candidates.detailBase}/${candidate.id}`}>
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
              href={`${APP_ROUTES.internal.candidates.list}${buildQuery({
                client: clientFilter,
                exp: expFilter,
                page: Math.max(currentPage - 1, 1),
                q: searchTerm,
                source: sourceFilter,
              })}`}
            >
              ‹
            </Link>

            <Link
              className={`candidate-mgmt-page-btn ${leftPage === currentPage ? 'candidate-mgmt-page-btn-active' : ''}`}
              href={`${APP_ROUTES.internal.candidates.list}${buildQuery({
                client: clientFilter,
                exp: expFilter,
                page: leftPage,
                q: searchTerm,
                source: sourceFilter,
              })}`}
            >
              {leftPage}
            </Link>

            {rightPage !== leftPage ? (
              <Link
                className={`candidate-mgmt-page-btn ${rightPage === currentPage ? 'candidate-mgmt-page-btn-active' : ''}`}
                href={`${APP_ROUTES.internal.candidates.list}${buildQuery({
                  client: clientFilter,
                  exp: expFilter,
                  page: rightPage,
                  q: searchTerm,
                  source: sourceFilter,
                })}`}
              >
                {rightPage}
              </Link>
            ) : null}

            <Link
              aria-disabled={currentPage >= totalPages}
              className={`candidate-mgmt-page-btn ${currentPage >= totalPages ? 'candidate-mgmt-page-btn-disabled' : ''}`}
              href={`${APP_ROUTES.internal.candidates.list}${buildQuery({
                client: clientFilter,
                exp: expFilter,
                page: Math.min(currentPage + 1, totalPages),
                q: searchTerm,
                source: sourceFilter,
              })}`}
            >
              ›
            </Link>
          </div>
        </footer>
      </section>
    </section>
  )
}
