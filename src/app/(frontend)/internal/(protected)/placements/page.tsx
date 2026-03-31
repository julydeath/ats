import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { PLACEMENT_STATUS_OPTIONS, PLACEMENT_TYPE_OPTIONS } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const PAGE_SIZE = 12

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as { email?: string; fullName?: string; name?: string; title?: string }
    return typed.fullName || typed.title || typed.name || typed.email || fallback
  }

  return fallback
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

const buildQuery = ({
  page,
  q,
  status,
}: {
  page: number
  q: string
  status: string
}) => {
  const params = new URLSearchParams()

  if (q) {
    params.set('q', q)
  }

  if (status) {
    params.set('status', status)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

type PlacementsPageProps = {
  searchParams?: Promise<{
    create?: string
    error?: string
    page?: string
    q?: string
    status?: string
    success?: string
  }>
}

export default async function PlacementsPage({ searchParams }: PlacementsPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}

  const canManagePlacements = user.role === 'admin' || user.role === 'leadRecruiter'
  const search = String(resolvedSearchParams.q || '').trim().toLowerCase()
  const statusFilter = String(resolvedSearchParams.status || '').trim()
  const page = Math.max(Number.parseInt(String(resolvedSearchParams.page || '1'), 10) || 1, 1)
  const isCreateOpen = resolvedSearchParams.create === '1'

  const [placementsResult, eligibleApplications] = await Promise.all([
    payload.find({
      collection: 'placements',
      depth: 1,
      limit: PAGE_SIZE,
      overrideAccess: false,
      page,
      select: {
        application: true,
        candidate: true,
        id: true,
        job: true,
        placementCode: true,
        placementType: true,
        projectDurationDays: true,
        status: true,
        tentativeStartDate: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
      where: {
        and: [
          ...(statusFilter
            ? [
                {
                  status: {
                    equals: statusFilter,
                  },
                },
              ]
            : []),
          ...(search
            ? [
                {
                  or: [
                    {
                      placementCode: {
                        contains: search,
                      },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    }),
    canManagePlacements
      ? payload.find({
          collection: 'applications',
          depth: 1,
          limit: 180,
          overrideAccess: false,
          pagination: false,
          select: {
            applicationCode: true,
            candidate: true,
            id: true,
            job: true,
            stage: true,
          },
          sort: '-updatedAt',
          user,
          where: {
            stage: {
              in: ['internalReviewApproved', 'candidateInvited', 'candidateApplied'],
            },
          },
        })
      : Promise.resolve({ docs: [] as Array<{ applicationCode?: string; candidate?: unknown; id: number | string; job?: unknown }> }),
  ])

  const existingPlacementApplicationIDs = new Set(
    placementsResult.docs
      .map((placement) => extractRelationshipID(placement.application))
      .filter((id): id is number | string => typeof id === 'number' || typeof id === 'string')
      .map((id) => String(id)),
  )

  const applicationOptions = eligibleApplications.docs.filter(
    (application) => !existingPlacementApplicationIDs.has(String(application.id)),
  )

  const currentPage = placementsResult.page || 1
  const totalPages = Math.max(placementsResult.totalPages || 1, 1)

  return (
    <section className="placements-workspace-page">
      <header className="placements-workspace-header">
        <div>
          <p className="placements-workspace-breadcrumb">Workspace &gt; Placements</p>
          <h1>Placements</h1>
          <p>Track joining lifecycle, billing/pay rates, and closure status for successful applications.</p>
        </div>
        <div className="placements-workspace-header-actions">
          <form className="placements-workspace-search" method="get">
            <input defaultValue={resolvedSearchParams.q || ''} name="q" placeholder="Search placement code" type="search" />
            <select defaultValue={statusFilter} name="status">
              <option value="">All Status</option>
              {PLACEMENT_STATUS_OPTIONS.map((option) => (
                <option key={`placement-status-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="submit">Filter</button>
          </form>
          {canManagePlacements ? (
            <Link className="placements-workspace-main-action" href={`${APP_ROUTES.internal.placements.list}?create=1`}>
              + Add Placement
            </Link>
          ) : null}
        </div>
      </header>

      {resolvedSearchParams.success ? (
        <p className="placements-workspace-feedback placements-workspace-feedback-success">Placement saved successfully.</p>
      ) : null}
      {resolvedSearchParams.error ? (
        <p className="placements-workspace-feedback placements-workspace-feedback-error">{resolvedSearchParams.error}</p>
      ) : null}

      <article className="placements-workspace-table-card">
        <table className="placements-workspace-table">
          <thead>
            <tr>
              <th>Placement</th>
              <th>Candidate / Job</th>
              <th>Type</th>
              <th>Tentative Start</th>
              <th>Duration</th>
              <th>Status</th>
              {canManagePlacements ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {placementsResult.docs.length === 0 ? (
              <tr>
                <td className="placements-workspace-empty" colSpan={canManagePlacements ? 7 : 6}>
                  No placements found.
                </td>
              </tr>
            ) : (
              placementsResult.docs.map((placement) => (
                <tr key={`placement-${placement.id}`}>
                  <td>
                    <div className="placements-workspace-cell-title">
                      <strong>{placement.placementCode || `PLC-${placement.id}`}</strong>
                      <small>{readLabel(placement.application)}</small>
                    </div>
                  </td>
                  <td>
                    <div className="placements-workspace-cell-meta">
                      <span>{readLabel(placement.candidate)}</span>
                      <small>{readLabel(placement.job)}</small>
                    </div>
                  </td>
                  <td>{String(placement.placementType || 'recurringRevenue')}</td>
                  <td>{formatDate(placement.tentativeStartDate)}</td>
                  <td>{placement.projectDurationDays ? `${placement.projectDurationDays} days` : 'N/A'}</td>
                  <td>
                    <span className={`placements-workspace-status placements-workspace-status-${String(placement.status || 'active')}`}>
                      {String(placement.status || 'active')}
                    </span>
                  </td>
                  {canManagePlacements ? (
                    <td>
                      <form action={APP_ROUTES.internal.placements.updateStatus} className="placements-workspace-inline-form" method="post">
                        <input name="placementId" type="hidden" value={String(placement.id)} />
                        <select defaultValue={String(placement.status || 'active')} name="status">
                          {PLACEMENT_STATUS_OPTIONS.map((option) => (
                            <option key={`inline-placement-${placement.id}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button type="submit">Update</button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <footer className="placements-workspace-pagination">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div>
            <Link
              className={currentPage <= 1 ? 'placements-workspace-page-btn placements-workspace-page-btn-disabled' : 'placements-workspace-page-btn'}
              href={`${APP_ROUTES.internal.placements.list}${buildQuery({ page: Math.max(currentPage - 1, 1), q: String(resolvedSearchParams.q || ''), status: statusFilter })}`}
            >
              Prev
            </Link>
            <Link
              className={currentPage >= totalPages ? 'placements-workspace-page-btn placements-workspace-page-btn-disabled' : 'placements-workspace-page-btn'}
              href={`${APP_ROUTES.internal.placements.list}${buildQuery({ page: Math.min(currentPage + 1, totalPages), q: String(resolvedSearchParams.q || ''), status: statusFilter })}`}
            >
              Next
            </Link>
          </div>
        </footer>
      </article>

      {canManagePlacements && isCreateOpen ? (
        <div className="placements-workspace-modal-wrap">
          <div className="placements-workspace-modal-backdrop" />
          <div className="placements-workspace-modal">
            <header>
              <h2>Create Placement</h2>
              <Link href={APP_ROUTES.internal.placements.list}>×</Link>
            </header>
            <form action={APP_ROUTES.internal.placements.create} method="post">
              <div className="placements-workspace-modal-grid">
                <label className="placements-workspace-modal-span-2">
                  <span>Application *</span>
                  <select name="application" required>
                    <option value="">Select approved application</option>
                    {applicationOptions.map((application) => (
                      <option key={`placement-app-${application.id}`} value={String(application.id)}>
                        {(application.applicationCode || `APP-${application.id}`)} | {readLabel(application.candidate)} | {readLabel(application.job)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Placement Type *</span>
                  <select defaultValue="recurringRevenue" name="placementType" required>
                    {PLACEMENT_TYPE_OPTIONS.map((option) => (
                      <option key={`placement-type-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Status *</span>
                  <select defaultValue="active" name="status" required>
                    {PLACEMENT_STATUS_OPTIONS.map((option) => (
                      <option key={`placement-create-status-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Client/Prime Vendor</span>
                  <input name="clientPrimeVendor" type="text" />
                </label>
                <label>
                  <span>Business Unit</span>
                  <input name="businessUnit" type="text" />
                </label>
                <label>
                  <span>Client Bill Rate</span>
                  <input name="clientBillRate" type="text" />
                </label>
                <label>
                  <span>Pay Rate</span>
                  <input name="payRate" type="text" />
                </label>
                <label>
                  <span>Per Diem / Hr</span>
                  <input name="perDiemPerHour" type="text" />
                </label>
                <label>
                  <span>Overhead</span>
                  <input name="overhead" type="text" />
                </label>
                <label>
                  <span>Margin</span>
                  <input name="margin" type="text" />
                </label>
                <label>
                  <span>Tentative Start Date</span>
                  <input name="tentativeStartDate" type="date" />
                </label>
                <label>
                  <span>Actual Start Date</span>
                  <input name="actualStartDate" type="date" />
                </label>
                <label>
                  <span>Actual End Date</span>
                  <input name="actualEndDate" type="date" />
                </label>
                <label className="placements-workspace-modal-span-2">
                  <span>Notes</span>
                  <textarea name="notes" rows={3} />
                </label>
              </div>

              <footer>
                <Link href={APP_ROUTES.internal.placements.list}>Cancel</Link>
                <button type="submit">Save Placement</button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
