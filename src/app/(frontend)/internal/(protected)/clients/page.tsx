import configPromise from '@payload-config'
import Image from 'next/image'
import Link from 'next/link'
import { getPayload, type Where } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const PAGE_SIZE = 9

const CLIENT_SIZE_OPTIONS = [
  { label: '1-50', value: '1-50' },
  { label: '51-200', value: '51-200' },
  { label: '201-1000', value: '201-1000' },
  { label: '1000+', value: '1000+' },
] as const

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as { email?: string; fullName?: string; name?: string; title?: string }
    return typed.fullName || typed.name || typed.title || typed.email || fallback
  }

  return fallback
}

const getInitials = (value: string): string =>
  value
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

const parsePage = (value: string | undefined): number => {
  if (!value || !/^\d+$/.test(value)) {
    return 1
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

const buildClientsQuery = ({
  page,
  q,
  status,
}: {
  page: number
  q: string
  status: string
}): string => {
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

const readLogoMeta = (
  value: unknown,
): {
  alt: string
  url: string | null
} => {
  if (!value || typeof value !== 'object') {
    return {
      alt: 'Client logo',
      url: null,
    }
  }

  const typed = value as {
    alt?: unknown
    url?: unknown
  }

  return {
    alt: typeof typed.alt === 'string' && typed.alt.trim().length > 0 ? typed.alt : 'Client logo',
    url: typeof typed.url === 'string' ? typed.url : null,
  }
}

type ClientsPageProps = {
  searchParams?: Promise<{
    create?: string
    error?: string
    page?: string
    q?: string
    status?: string
    success?: string
  }>
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchTerm = String(resolvedSearchParams.q || '').trim()
  const statusFilter =
    resolvedSearchParams.status === 'active' || resolvedSearchParams.status === 'inactive'
      ? resolvedSearchParams.status
      : ''
  const requestedPage = parsePage(resolvedSearchParams.page)
  const isCreateModalOpen = resolvedSearchParams.create === '1'
  const canManageClients = user.role === 'admin'

  const whereConditions: Where[] = []

  if (searchTerm) {
    whereConditions.push({
      or: [{ name: { contains: searchTerm } }, { location: { contains: searchTerm } }, { contactPerson: { contains: searchTerm } }],
    })
  }

  if (statusFilter) {
    whereConditions.push({
      status: {
        equals: statusFilter,
      },
    })
  }

  const whereQuery: Where | undefined =
    whereConditions.length === 0 ? undefined : whereConditions.length === 1 ? whereConditions[0] : { and: whereConditions }

  const [clientsResult, leadsResult, totalCount, activeCount, inactiveCount, unassignedCount] = await Promise.all([
    payload.find({
      collection: 'clients',
      depth: 1,
      limit: PAGE_SIZE,
      overrideAccess: false,
      page: requestedPage,
      select: {
        address: true,
        billingTerms: true,
        companySize: true,
        contactPerson: true,
        email: true,
        id: true,
        industry: true,
        location: true,
        logo: true,
        name: true,
        notes: true,
        owningHeadRecruiter: true,
        phone: true,
        status: true,
        updatedAt: true,
        website: true,
      },
      sort: '-updatedAt',
      user,
      where: whereQuery,
    }),
    canManageClients
      ? payload.find({
          collection: 'users',
          depth: 0,
          limit: 120,
          overrideAccess: false,
          pagination: false,
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
                  equals: 'leadRecruiter',
                },
              },
              {
                isActive: {
                  equals: true,
                },
              },
            ],
          },
        })
      : Promise.resolve({
          docs: [] as Array<{ email?: string; fullName?: string; id: number | string }>,
        }),
    payload.count({
      collection: 'clients',
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'clients',
      overrideAccess: false,
      user,
      where: {
        status: {
          equals: 'active',
        },
      },
    }),
    payload.count({
      collection: 'clients',
      overrideAccess: false,
      user,
      where: {
        status: {
          equals: 'inactive',
        },
      },
    }),
    payload.count({
      collection: 'clients',
      overrideAccess: false,
      user,
      where: {
        owningHeadRecruiter: {
          exists: false,
        },
      },
    }),
  ])

  const clientIDs = clientsResult.docs.map((client) => client.id)
  const jobsForVisibleClients =
    clientIDs.length === 0
      ? { docs: [] as Array<{ client?: number | string | null; status?: string | null }> }
      : await payload.find({
          collection: 'jobs',
          depth: 0,
          limit: 500,
          overrideAccess: false,
          pagination: false,
          select: {
            client: true,
            status: true,
          },
          user,
          where: {
            client: {
              in: clientIDs,
            },
          },
        })

  const jobStatsByClientID = new Map<string, { active: number; total: number }>()
  jobsForVisibleClients.docs.forEach((job) => {
    const clientID = extractRelationshipID(job.client)
    if (!clientID) {
      return
    }

    const key = String(clientID)
    const prev = jobStatsByClientID.get(key) || { active: 0, total: 0 }
    const isActive = job.status === 'active' || job.status === 'onHold'
    jobStatsByClientID.set(key, {
      active: prev.active + (isActive ? 1 : 0),
      total: prev.total + 1,
    })
  })

  const successMessage =
    resolvedSearchParams.success === 'clientCreated'
      ? 'Client profile created successfully.'
      : resolvedSearchParams.success === 'clientUpdated'
        ? 'Client details updated successfully.'
        : ''

  const currentPage = clientsResult.page || 1
  const totalPages = Math.max(clientsResult.totalPages || 1, 1)
  const previousPage = Math.max(currentPage - 1, 1)
  const nextPage = Math.min(currentPage + 1, totalPages)

  return (
    <section className="clients-grid-page">
      <header className="clients-grid-header">
        <div>
          <p className="clients-grid-kicker">Clients</p>
          <h1>Clients Directory</h1>
          <p>Manage client accounts with clear ownership, branding, and hiring context.</p>
        </div>
        {canManageClients ? (
          <div className="clients-grid-header-actions">
            <Link className="clients-grid-header-btn" href={APP_ROUTES.internal.assignments.head}>
              Assign Leads
            </Link>
            <Link className="clients-grid-header-btn clients-grid-header-btn-primary" href={`${APP_ROUTES.internal.clients.list}?create=1`}>
              + Add Client
            </Link>
          </div>
        ) : null}
      </header>

      {successMessage ? <p className="clients-grid-feedback clients-grid-feedback-success">{successMessage}</p> : null}
      {resolvedSearchParams.error ? <p className="clients-grid-feedback clients-grid-feedback-error">{resolvedSearchParams.error}</p> : null}

      <section className="clients-grid-kpis">
        <article className="clients-grid-kpi">
          <p>Total Clients</p>
          <strong>{totalCount.totalDocs}</strong>
        </article>
        <article className="clients-grid-kpi">
          <p>Active</p>
          <strong>{activeCount.totalDocs}</strong>
        </article>
        <article className="clients-grid-kpi">
          <p>Inactive</p>
          <strong>{inactiveCount.totalDocs}</strong>
        </article>
        <article className="clients-grid-kpi">
          <p>Unassigned Lead</p>
          <strong>{unassignedCount.totalDocs}</strong>
        </article>
      </section>

      <article className="clients-grid-toolbar-card">
        <form className="clients-grid-toolbar" method="get">
          <input
            defaultValue={searchTerm}
            name="q"
            placeholder="Search by client, location, contact..."
            type="search"
          />

          <select defaultValue={statusFilter} name="status">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button type="submit">Apply</button>
          <Link href={APP_ROUTES.internal.clients.list}>Reset</Link>
        </form>
      </article>

      {clientsResult.docs.length === 0 ? (
        <article className="clients-grid-empty">
          No clients found for this filter set.
        </article>
      ) : (
        <section className="clients-grid-cards">
          {clientsResult.docs.map((client) => {
            const logo = readLogoMeta(client.logo)
            const leadLabel = readLabel(client.owningHeadRecruiter, 'Unassigned')
            const stats = jobStatsByClientID.get(String(client.id)) || { active: 0, total: 0 }

            return (
              <article className="client-grid-card" key={`client-${client.id}`}>
                <header className="client-grid-card-head">
                  <div className="client-grid-logo-wrap">
                    {logo.url ? (
                      <Image alt={logo.alt} className="client-grid-logo" height={36} src={logo.url} width={36} />
                    ) : (
                      <span className="client-grid-logo-fallback">{getInitials(client.name)}</span>
                    )}
                  </div>
                  <div className="client-grid-card-title-wrap">
                    <h3>{client.name}</h3>
                    <p>{client.industry || 'Industry not set'}</p>
                  </div>
                  <span
                    className={
                      client.status === 'active'
                        ? 'client-grid-status client-grid-status-active'
                        : 'client-grid-status client-grid-status-inactive'
                    }
                  >
                    {client.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </header>

                <div className="client-grid-info">
                  <p>
                    <span>Location</span>
                    {client.location || client.address || 'Not provided'}
                  </p>
                  <p>
                    <span>Contact</span>
                    {client.contactPerson}
                  </p>
                  <p>
                    <span>Email</span>
                    {client.email}
                  </p>
                  <p>
                    <span>Phone</span>
                    {client.phone}
                  </p>
                  <p>
                    <span>Lead</span>
                    {leadLabel}
                  </p>
                  <p>
                    <span>Jobs</span>
                    {stats.active} active / {stats.total} total
                  </p>
                </div>

                <footer className="client-grid-actions">
                  <Link className="client-grid-action client-grid-action-primary" href={`${APP_ROUTES.internal.jobs.assigned}?client=${client.id}`}>
                    Jobs
                  </Link>
                  <Link className="client-grid-action" href={`${APP_ROUTES.internal.clients.detailBase}/${client.id}`}>
                    See More
                  </Link>
                </footer>
              </article>
            )
          })}
        </section>
      )}

      <footer className="clients-grid-pagination">
        <p>
          Page {currentPage} of {totalPages}
        </p>

        <div className="clients-grid-pagination-links">
          <Link
            aria-disabled={currentPage <= 1}
            className={currentPage <= 1 ? 'clients-grid-page-link clients-grid-page-link-disabled' : 'clients-grid-page-link'}
            href={`${APP_ROUTES.internal.clients.list}${buildClientsQuery({ page: previousPage, q: searchTerm, status: statusFilter })}`}
          >
            ‹
          </Link>
          <span className="clients-grid-page-indicator">{currentPage}</span>
          <Link
            aria-disabled={currentPage >= totalPages}
            className={currentPage >= totalPages ? 'clients-grid-page-link clients-grid-page-link-disabled' : 'clients-grid-page-link'}
            href={`${APP_ROUTES.internal.clients.list}${buildClientsQuery({ page: nextPage, q: searchTerm, status: statusFilter })}`}
          >
            ›
          </Link>
        </div>
      </footer>

      {isCreateModalOpen && canManageClients ? (
        <section aria-label="Create Client Profile" aria-modal="true" className="clients-create-modal-layer" role="dialog">
          <div className="clients-create-modal-backdrop" />
          <article className="clients-create-modal">
            <div className="clients-create-modal-head">
              <div>
                <h2>Create Client Profile</h2>
                <p>Capture branding, primary ownership, and business details in one step.</p>
              </div>
              <Link className="clients-create-modal-close" href={APP_ROUTES.internal.clients.list}>
                ✕
              </Link>
            </div>

            <form
              action={APP_ROUTES.internal.clients.create}
              className="clients-create-modal-form"
              encType="multipart/form-data"
              method="post"
            >
              <label>
                <span>Organization Name *</span>
                <input name="name" placeholder="e.g. Acme Corp" required type="text" />
              </label>

              <div className="clients-create-modal-grid">
                <label>
                  <span>Contact Person *</span>
                  <input name="contactPerson" placeholder="Primary stakeholder" required type="text" />
                </label>
                <label>
                  <span>Phone *</span>
                  <input name="phone" placeholder="+91 90000 00000" required type="text" />
                </label>
              </div>

              <div className="clients-create-modal-grid">
                <label>
                  <span>Contact Email *</span>
                  <input name="email" placeholder="contact@company.com" required type="email" />
                </label>
                <label>
                  <span>Status</span>
                  <select defaultValue="active" name="status">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="clients-create-modal-grid">
                <label>
                  <span>Industry</span>
                  <input name="industry" placeholder="Technology, Finance..." type="text" />
                </label>
                <label>
                  <span>Company Size</span>
                  <select defaultValue="" name="companySize">
                    <option value="">Select size</option>
                    {CLIENT_SIZE_OPTIONS.map((option) => (
                      <option key={`company-size-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="clients-create-modal-grid">
                <label>
                  <span>Location</span>
                  <input name="location" placeholder="Hyderabad, India" type="text" />
                </label>
                <label>
                  <span>Website</span>
                  <input name="website" placeholder="https://example.com" type="url" />
                </label>
              </div>

              <div className="clients-create-modal-grid">
                <label>
                  <span>Assigned Lead</span>
                  <select defaultValue="" name="leadRecruiterId">
                    <option value="">Unassigned</option>
                    {leadsResult.docs.map((lead) => (
                      <option key={`lead-${lead.id}`} value={String(lead.id)}>
                        {lead.fullName || lead.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Logo</span>
                  <input accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" name="logo" type="file" />
                </label>
              </div>

              <div className="clients-create-modal-grid">
                <label>
                  <span>Address</span>
                  <textarea name="address" placeholder="Street, city, state, country" rows={2} />
                </label>
                <label>
                  <span>Billing Terms</span>
                  <textarea name="billingTerms" placeholder="Net 30, milestone based, etc." rows={2} />
                </label>
              </div>

              <label>
                <span>Notes</span>
                <textarea name="notes" placeholder="Client expectations, constraints, SLA notes..." rows={3} />
              </label>

              <div className="clients-create-modal-footer">
                <Link className="clients-create-modal-cancel" href={APP_ROUTES.internal.clients.list}>
                  Discard
                </Link>
                <button className="clients-create-modal-submit" data-pending-label="Creating..." type="submit">
                  Create Client
                </button>
              </div>
            </form>
          </article>
        </section>
      ) : null}
    </section>
  )
}
