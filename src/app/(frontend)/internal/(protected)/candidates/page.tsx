import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload, type Where } from 'payload'

import { BulkTableControls } from '@/components/internal/BulkTableControls'
import { FilterToolbar } from '@/components/internal/FilterToolbar'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { CANDIDATE_SOURCE_OPTIONS } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'
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

type CandidatesListPageProps = {
  searchParams?: Promise<{
    error?: string
    q?: string
    readiness?: string
    resume?: string
    source?: string
  }>
}

export default async function CandidatesListPage({ searchParams }: CandidatesListPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchTerm = (resolvedSearchParams.q || '').trim()
  const sourceFilter = resolvedSearchParams.source || ''
  const readinessFilter = resolvedSearchParams.readiness || ''
  const resumeFilter = resolvedSearchParams.resume || ''
  const canCreateCandidate = user.role === 'admin' || user.role === 'recruiter'
  const canCreateApplication = user.role === 'admin' || user.role === 'recruiter'

  const whereConditions: Where[] = []

  if (sourceFilter) {
    whereConditions.push({
      source: {
        equals: sourceFilter,
      },
    })
  }

  if (searchTerm) {
    whereConditions.push({
      or: [
        {
          fullName: {
            contains: searchTerm,
          },
        },
        {
          email: {
            contains: searchTerm,
          },
        },
        {
          phone: {
            contains: searchTerm,
          },
        },
        {
          currentCompany: {
            contains: searchTerm,
          },
        },
      ],
    })
  }

  const candidates = await payload.find({
    collection: 'candidates',
    depth: 1,
    limit: 120,
    pagination: false,
    overrideAccess: false,
    select: {
      email: true,
      fullName: true,
      id: true,
      phone: true,
      resume: true,
      source: true,
      sourceJob: true,
      sourcedBy: true,
      updatedAt: true,
    },
    sort: '-updatedAt',
    user,
    where: whereConditions.length === 0 ? undefined : ({ and: whereConditions } as Where),
  })

  const candidateIDs = candidates.docs
    .map((candidate) => (typeof candidate.id === 'number' ? candidate.id : null))
    .filter((id): id is number => id !== null)

  const applications =
    candidateIDs.length === 0
      ? { docs: [] as Array<{ candidate?: unknown }> }
      : await payload.find({
          collection: 'applications',
          depth: 0,
          limit: candidateIDs.length * 3,
          pagination: false,
          overrideAccess: false,
          select: {
            candidate: true,
          },
          user,
          where: {
            candidate: {
              in: candidateIDs,
            },
          },
        })

  const candidateWithApplicationIDs = new Set(
    applications.docs
      .map((application) => extractRelationshipID(application.candidate))
      .filter(Boolean)
      .map((candidateID) => String(candidateID)),
  )

  const candidateMeta = candidates.docs.map((candidate) => {
    const hasContact = Boolean(candidate.email || candidate.phone)
    const hasSourceJob = Boolean(extractRelationshipID(candidate.sourceJob))
    const hasApplication = candidateWithApplicationIDs.has(String(candidate.id))
    const hasResume = Boolean(extractRelationshipID(candidate.resume))
    const readiness =
      hasContact && hasSourceJob && !hasApplication
        ? 'ready'
        : !hasContact
          ? 'needsFix'
          : hasApplication
            ? 'mapped'
            : 'inProgress'

    return {
      candidate,
      hasApplication,
      hasResume,
      readiness,
    }
  })

  const filteredMeta = candidateMeta.filter((entry) => {
    if (readinessFilter && entry.readiness !== readinessFilter) {
      return false
    }

    if (resumeFilter === 'withResume' && !entry.hasResume) {
      return false
    }

    if (resumeFilter === 'withoutResume' && entry.hasResume) {
      return false
    }

    return true
  })

  const filteredCandidates = filteredMeta.map((entry) => entry.candidate)

  const candidatesMissingContact = filteredCandidates.filter((candidate) => !candidate.email && !candidate.phone)
  const candidatesReadyForApplication = filteredCandidates.filter((candidate) => {
    const hasContact = Boolean(candidate.email || candidate.phone)
    const hasSourceJob = Boolean(extractRelationshipID(candidate.sourceJob))
    const alreadyMapped = candidateWithApplicationIDs.has(String(candidate.id))

    return hasContact && hasSourceJob && !alreadyMapped
  })
  const candidatesAlreadyMapped = filteredCandidates.filter((candidate) =>
    candidateWithApplicationIDs.has(String(candidate.id)),
  )
  const candidatesWithoutResume = filteredCandidates.filter((candidate) => !extractRelationshipID(candidate.resume))

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">Candidate Bank</p>
        <h1>Candidate Sourcing Workspace</h1>
        <p className="panel-intro">
          Signed in as <strong>{INTERNAL_ROLE_LABELS[user.role]}</strong>. This page is the master record
          for external candidates before and during application mapping.
        </p>
        {resolvedSearchParams.error ? <p className="error-text">{resolvedSearchParams.error}</p> : null}
        <div className="public-actions">
          {canCreateCandidate ? (
            <Link className="button" href={APP_ROUTES.internal.candidates.new}>
              Add New Candidate
            </Link>
          ) : null}
          <Link className="button button-secondary" href={APP_ROUTES.internal.applications.list}>
            Open Applications
          </Link>
        </div>
      </article>

      <article className="panel">
        <h2>How To Use This Page</h2>
        <div className="workflow-steps">
          <div className="workflow-step">
            <span className="workflow-step-number">1</span>
            <div>
              <p className="workflow-step-title">Create complete master profile</p>
              <p className="workflow-step-desc">Capture source, contact details, and resume.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">2</span>
            <div>
              <p className="workflow-step-title">Check readiness for submission</p>
              <p className="workflow-step-desc">Ensure source job and contact fields are available.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">3</span>
            <div>
              <p className="workflow-step-title">Create job application</p>
              <p className="workflow-step-desc">Map candidate to job for internal review workflow.</p>
            </div>
          </div>
        </div>
      </article>

      <article className="panel">
        <h2>Quality Snapshot</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <p className="kpi-value">{filteredCandidates.length}</p>
            <p className="kpi-label">Candidates In Current View</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{candidatesReadyForApplication.length}</p>
            <p className="kpi-label">Ready For Application</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{candidatesAlreadyMapped.length}</p>
            <p className="kpi-label">Already Mapped To Jobs</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{candidatesMissingContact.length}</p>
            <p className="kpi-label">Missing Contact Information</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{candidatesWithoutResume.length}</p>
            <p className="kpi-label">Missing Resume Upload</p>
          </div>
        </div>
      </article>

      <FilterToolbar
        fields={[
          {
            key: 'q',
            label: 'Search',
            type: 'search',
            placeholder: 'Name, email, phone, company',
          },
          {
            key: 'source',
            label: 'Source',
            type: 'select',
            options: CANDIDATE_SOURCE_OPTIONS,
          },
          {
            key: 'readiness',
            label: 'Readiness',
            type: 'select',
            options: [
              { label: 'Ready for application', value: 'ready' },
              { label: 'Needs data fix', value: 'needsFix' },
              { label: 'Already mapped', value: 'mapped' },
              { label: 'In progress', value: 'inProgress' },
            ],
          },
          {
            key: 'resume',
            label: 'Resume',
            type: 'select',
            options: [
              { label: 'With resume', value: 'withResume' },
              { label: 'Without resume', value: 'withoutResume' },
            ],
          },
        ]}
        storageKey="candidates-list"
        title="Filter Candidate Bank"
      />

      <article className="panel panel-span-2">
        <h2>Candidate Action Board</h2>
        <div className="kanban-board">
          <section className="kanban-column">
            <div className="kanban-column-header">
              <h3>Needs Data Fix</h3>
              <span className="kanban-count">{candidatesMissingContact.length}</span>
            </div>
            <div className="kanban-cards">
              {candidatesMissingContact.length === 0 ? (
                <p className="board-empty">No candidates are missing contact data.</p>
              ) : (
                candidatesMissingContact.slice(0, 8).map((candidate) => (
                  <article className="kanban-card" key={`candidate-missing-${candidate.id}`}>
                    <p className="kanban-title">{candidate.fullName}</p>
                    <p className="kanban-meta">Source Job: {readLabel(candidate.sourceJob)}</p>
                    <p className="kanban-meta">Sourced By: {readLabel(candidate.sourcedBy, 'System')}</p>
                    <div className="public-actions">
                      <Link
                        className="button button-secondary"
                        href={`${APP_ROUTES.internal.candidates.detailBase}/${candidate.id}`}
                      >
                        Open Detail
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="kanban-column">
            <div className="kanban-column-header">
              <h3>Ready For Application</h3>
              <span className="kanban-count">{candidatesReadyForApplication.length}</span>
            </div>
            <div className="kanban-cards">
              {candidatesReadyForApplication.length === 0 ? (
                <p className="board-empty">No ready candidates right now.</p>
              ) : (
                candidatesReadyForApplication.slice(0, 8).map((candidate) => (
                  <article className="kanban-card" key={`candidate-ready-${candidate.id}`}>
                    <p className="kanban-title">{candidate.fullName}</p>
                    <p className="kanban-meta">Email: {candidate.email || 'Not provided'}</p>
                    <p className="kanban-meta">Phone: {candidate.phone || 'Not provided'}</p>
                    <p className="kanban-meta">Source Job: {readLabel(candidate.sourceJob)}</p>
                    <div className="public-actions">
                      <Link
                        className="button button-secondary"
                        href={`${APP_ROUTES.internal.candidates.detailBase}/${candidate.id}`}
                      >
                        Open Detail
                      </Link>
                      {canCreateApplication ? (
                        <Link
                          className="button"
                          href={`${APP_ROUTES.internal.applications.new}?candidateId=${candidate.id}&jobId=${
                            extractRelationshipID(candidate.sourceJob) || ''
                          }`}
                        >
                          Create Application
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="kanban-column">
            <div className="kanban-column-header">
              <h3>Already In Applications</h3>
              <span className="kanban-count">{candidatesAlreadyMapped.length}</span>
            </div>
            <div className="kanban-cards">
              {candidatesAlreadyMapped.length === 0 ? (
                <p className="board-empty">No mapped candidates yet.</p>
              ) : (
                candidatesAlreadyMapped.slice(0, 8).map((candidate) => (
                  <article className="kanban-card" key={`candidate-mapped-${candidate.id}`}>
                    <p className="kanban-title">{candidate.fullName}</p>
                    <p className="kanban-meta">Source: {candidate.source}</p>
                    <p className="kanban-meta">
                      Resume: {extractRelationshipID(candidate.resume) ? 'Uploaded' : 'Missing'}
                    </p>
                    <div className="public-actions">
                      <Link
                        className="button button-secondary"
                        href={`${APP_ROUTES.internal.candidates.detailBase}/${candidate.id}`}
                      >
                        Open Detail
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Candidate Directory</h2>
        <BulkTableControls exportFilename="candidates-selection.csv" itemLabel="candidate" tableId="candidates-table" />
        {filteredCandidates.length === 0 ? (
          <p className="board-empty">No candidates available in your hierarchy scope.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table" data-bulk-table="candidates-table">
              <thead>
                <tr>
                  <th className="table-select-cell">Select</th>
                  <th>Candidate</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Source Job</th>
                  <th>Resume</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => (
                  <tr key={`candidate-row-${candidate.id}`}>
                    <td className="table-select-cell">
                      <input
                        data-bulk-item="true"
                        data-row={JSON.stringify({
                          id: String(candidate.id),
                          candidate: candidate.fullName,
                          source: candidate.source,
                          sourceJob: readLabel(candidate.sourceJob),
                          contact: candidate.email || candidate.phone || 'Missing',
                        })}
                        type="checkbox"
                      />
                    </td>
                    <td>{candidate.fullName}</td>
                    <td>{candidate.email || candidate.phone || 'Missing'}</td>
                    <td>{candidate.source}</td>
                    <td>{readLabel(candidate.sourceJob)}</td>
                    <td>{extractRelationshipID(candidate.resume) ? 'Uploaded' : 'Missing'}</td>
                    <td>
                      <div className="public-actions">
                        <Link
                          className="button button-secondary"
                          href={`${APP_ROUTES.internal.candidates.detailBase}/${candidate.id}`}
                        >
                          Open
                        </Link>
                        {canCreateApplication ? (
                          <Link
                            className="button button-secondary"
                            href={`${APP_ROUTES.internal.applications.new}?candidateId=${candidate.id}&jobId=${
                              extractRelationshipID(candidate.sourceJob) || ''
                            }`}
                          >
                            Application
                          </Link>
                        ) : null}
                      </div>
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
}
