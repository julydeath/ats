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
    exp?: string
    page?: string
    q?: string
    skill?: string
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
  exp,
  page,
  q,
  skill,
  source,
}: {
  exp: string
  page: number
  q: string
  skill: string
  source: string
}): string => {
  const params = new URLSearchParams()

  if (q) {
    params.set('q', q)
  }

  if (skill) {
    params.set('skill', skill)
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
  const sourceFilter = (resolvedSearchParams.source || '').trim()
  const skillFilter = (resolvedSearchParams.skill || '').trim()
  const expFilter = (resolvedSearchParams.exp || '').trim()
  const requestedPage = Number.parseInt(String(resolvedSearchParams.page || '1'), 10)
  const canCreateCandidate = user.role === 'admin' || user.role === 'leadRecruiter' || user.role === 'recruiter'
  const canCreateApplication = user.role === 'admin' || user.role === 'leadRecruiter'

  const candidatesResult = await payload.find({
    collection: 'candidates',
    depth: 1,
    limit: 240,
    pagination: false,
    overrideAccess: false,
    select: {
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
  })

  const skillOptions = Array.from(
    new Set(
      candidatesResult.docs.flatMap((candidate) => {
        const skills = Array.isArray(candidate.skills)
          ? candidate.skills
              .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
              .filter((skill) => skill.length > 0)
          : []
        const role = (candidate.currentRole || '').trim()
        return role ? [...skills, role] : skills
      }),
    ),
  )
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 30)

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

    const role = (candidate.currentRole || '').trim()
    const skills = Array.isArray(candidate.skills)
      ? candidate.skills
          .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
          .filter((skill) => skill.length > 0)
      : []
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

    if (skillFilter && normalize(role) !== normalize(skillFilter)) {
      const wantedSkill = normalize(skillFilter)
      const hasSkillMatch = skills.some((skill) => normalize(skill) === wantedSkill)

      if (!hasSkillMatch) {
        return false
      }
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
            placeholder="Search by name, skill, company, phone..."
            type="search"
          />

          <select className="candidate-mgmt-select" defaultValue={skillFilter} name="skill">
            <option value="">Primary Skill</option>
            {skillOptions.map((skill) => (
              <option key={`skill-${skill}`} value={skill}>
                {skill}
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
                            <p className="candidate-mgmt-sub">{getRelativeDate(candidate.updatedAt)}</p>
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
                exp: expFilter,
                page: Math.max(currentPage - 1, 1),
                q: searchTerm,
                skill: skillFilter,
                source: sourceFilter,
              })}`}
            >
              ‹
            </Link>

            <Link
              className={`candidate-mgmt-page-btn ${leftPage === currentPage ? 'candidate-mgmt-page-btn-active' : ''}`}
              href={`${APP_ROUTES.internal.candidates.list}${buildQuery({
                exp: expFilter,
                page: leftPage,
                q: searchTerm,
                skill: skillFilter,
                source: sourceFilter,
              })}`}
            >
              {leftPage}
            </Link>

            {rightPage !== leftPage ? (
              <Link
                className={`candidate-mgmt-page-btn ${rightPage === currentPage ? 'candidate-mgmt-page-btn-active' : ''}`}
                href={`${APP_ROUTES.internal.candidates.list}${buildQuery({
                  exp: expFilter,
                  page: rightPage,
                  q: searchTerm,
                  skill: skillFilter,
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
                exp: expFilter,
                page: Math.min(currentPage + 1, totalPages),
                q: searchTerm,
                skill: skillFilter,
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
