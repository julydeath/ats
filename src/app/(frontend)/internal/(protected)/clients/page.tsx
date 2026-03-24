import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload, type Where } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const toDateTimeLabel = (value: string): string =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })

type ClientsPageProps = {
  searchParams?: Promise<{
    create?: string
    error?: string
    q?: string
    status?: string
    success?: string
  }>
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const user = await requireInternalRole(['admin'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchTerm = String(resolvedSearchParams.q || '').trim()
  const statusFilter = resolvedSearchParams.status === 'active' || resolvedSearchParams.status === 'inactive'
    ? resolvedSearchParams.status
    : ''
  const isCreateModalOpen = resolvedSearchParams.create === '1'

  const whereConditions: Where[] = []

  if (searchTerm) {
    whereConditions.push({
      or: [
        { name: { contains: searchTerm } },
        { contactPerson: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { phone: { contains: searchTerm } },
      ],
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

  const [clients, leads] = await Promise.all([
    payload.find({
      collection: 'clients',
      depth: 1,
      limit: 200,
      overrideAccess: false,
      pagination: false,
      select: {
        contactPerson: true,
        email: true,
        id: true,
        name: true,
        notes: true,
        owningHeadRecruiter: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
      where: whereQuery,
    }),
    payload.find({
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
    }),
  ])

  const totalCount = clients.docs.length
  const activeCount = clients.docs.filter((client) => client.status === 'active').length
  const inactiveCount = clients.docs.filter((client) => client.status === 'inactive').length
  const unassignedCount = clients.docs.filter((client) => !extractRelationshipID(client.owningHeadRecruiter)).length

  const successMessage =
    resolvedSearchParams.success === 'clientCreated'
      ? 'Client profile created successfully.'
      : resolvedSearchParams.success === 'clientUpdated'
        ? 'Client details updated successfully.'
        : ''

  return (
    <section className="clients-admin-page">
      <header className="clients-admin-header">
        <div>
          <p className="clients-admin-kicker">Clients | Admin</p>
          <h1>Client Management</h1>
          <p>Manage organization profiles, ownership, and status controls from one workspace.</p>
        </div>
        <div className="clients-admin-header-actions">
          <Link className="clients-header-button" href={APP_ROUTES.internal.assignments.head}>
            Assign Leads
          </Link>
          <Link className="clients-header-button clients-header-button-primary" href={`${APP_ROUTES.internal.clients.list}?create=1`}>
            + Create Client
          </Link>
        </div>
      </header>

      {successMessage ? <p className="clients-feedback clients-feedback-success">{successMessage}</p> : null}
      {resolvedSearchParams.error ? <p className="clients-feedback clients-feedback-error">{resolvedSearchParams.error}</p> : null}

      <section className="clients-admin-kpi-grid">
        <article className="clients-admin-kpi">
          <p>Total Clients</p>
          <strong>{totalCount}</strong>
        </article>
        <article className="clients-admin-kpi">
          <p>Active</p>
          <strong>{activeCount}</strong>
        </article>
        <article className="clients-admin-kpi">
          <p>Inactive</p>
          <strong>{inactiveCount}</strong>
        </article>
        <article className="clients-admin-kpi">
          <p>Unassigned Lead</p>
          <strong>{unassignedCount}</strong>
        </article>
      </section>

      <article className="clients-admin-card">
        <form className="clients-toolbar" method="get">
          <label className="clients-toolbar-search" htmlFor="clients-search">
            <span>Search</span>
            <input
              defaultValue={searchTerm}
              id="clients-search"
              name="q"
              placeholder="Search by client, contact, email, phone..."
              type="text"
            />
          </label>

          <label className="clients-toolbar-filter" htmlFor="clients-status">
            <span>Status</span>
            <select defaultValue={statusFilter} id="clients-status" name="status">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <button className="clients-toolbar-button" type="submit">
            Apply
          </button>
          <Link className="clients-toolbar-button clients-toolbar-button-secondary" href={APP_ROUTES.internal.clients.list}>
            Reset
          </Link>
        </form>

        <div className="clients-table-wrapper">
          <table className="clients-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Contact</th>
                <th>Primary Lead</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.docs.length === 0 ? (
                <tr>
                  <td className="clients-table-empty" colSpan={7}>
                    No clients found for current filters.
                  </td>
                </tr>
              ) : (
                clients.docs.map((client) => {
                  const formID = `client-update-${client.id}`

                  return (
                    <tr key={`client-row-${client.id}`}>
                      <td>
                        <p className="clients-table-name">{client.name}</p>
                        <p className="clients-table-subtitle">{client.contactPerson}</p>
                      </td>
                      <td>
                        <p className="clients-table-subtitle">{client.email}</p>
                        <p className="clients-table-subtitle">{client.phone}</p>
                      </td>
                      <td>
                        <select
                          className="clients-inline-select"
                          defaultValue={String(extractRelationshipID(client.owningHeadRecruiter) || '')}
                          form={formID}
                          name="leadRecruiterId"
                        >
                          <option value="">Unassigned</option>
                          {leads.docs.map((lead) => (
                            <option key={`client-row-${client.id}-lead-${lead.id}`} value={String(lead.id)}>
                              {lead.fullName || lead.email}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span
                          className={
                            client.status === 'active'
                              ? 'clients-status-pill clients-status-pill-active'
                              : 'clients-status-pill clients-status-pill-inactive'
                          }
                        >
                          {client.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        <select
                          className="clients-inline-select clients-inline-select-sm"
                          defaultValue={client.status}
                          form={formID}
                          name="status"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td>
                        <input
                          className="clients-inline-input"
                          defaultValue={client.notes || ''}
                          form={formID}
                          name="notes"
                          placeholder="Add note"
                          type="text"
                        />
                      </td>
                      <td className="clients-table-subtitle">{toDateTimeLabel(client.updatedAt)}</td>
                      <td>
                        <form action={APP_ROUTES.internal.clients.create} id={formID} method="post">
                          <input name="clientId" type="hidden" value={String(client.id)} />
                          <button className="clients-row-save" data-pending-label="Saving..." type="submit">
                            Save
                          </button>
                        </form>
                        <Link className="clients-row-link" href={APP_ROUTES.internal.jobs.assigned}>
                          Jobs
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </article>

      {isCreateModalOpen ? (
        <section className="clients-modal-layer" role="dialog" aria-modal="true" aria-label="Create Client Profile">
          <div className="clients-modal-backdrop" />
          <article className="clients-modal">
            <div className="clients-modal-head">
              <div>
                <h2>Create Client Profile</h2>
                <p>Add a new organization to the recruitment ecosystem.</p>
              </div>
              <Link className="clients-modal-close" href={APP_ROUTES.internal.clients.list}>
                ✕
              </Link>
            </div>

            <form action={APP_ROUTES.internal.clients.create} className="clients-modal-form" method="post">
              <label className="clients-modal-field" htmlFor="client-modal-name">
                <span>Organization Name</span>
                <input id="client-modal-name" name="name" placeholder="e.g. Acme Corp" required type="text" />
              </label>

              <div className="clients-modal-grid">
                <label className="clients-modal-field" htmlFor="client-modal-industry">
                  <span>Industry</span>
                  <select defaultValue="" id="client-modal-industry" name="industry">
                    <option value="">Select industry</option>
                    <option value="technology">Technology</option>
                    <option value="finance">Finance</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="logistics">Logistics</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="clients-modal-field" htmlFor="client-modal-status">
                  <span>Status</span>
                  <select defaultValue="active" id="client-modal-status" name="status">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="clients-modal-grid">
                <label className="clients-modal-field" htmlFor="client-modal-contact">
                  <span>Contact Person</span>
                  <input id="client-modal-contact" name="contactPerson" placeholder="Primary contact name" required type="text" />
                </label>
                <label className="clients-modal-field" htmlFor="client-modal-phone">
                  <span>Phone</span>
                  <input id="client-modal-phone" name="phone" placeholder="+91 90000 00000" required type="text" />
                </label>
              </div>

              <label className="clients-modal-field" htmlFor="client-modal-email">
                <span>Primary Contact Email</span>
                <input id="client-modal-email" name="email" placeholder="contact@company.com" required type="email" />
              </label>

              <label className="clients-modal-field" htmlFor="client-modal-lead">
                <span>Assigned Account Lead</span>
                <select defaultValue="" id="client-modal-lead" name="leadRecruiterId">
                  <option value="">Unassigned</option>
                  {leads.docs.map((lead) => (
                    <option key={`client-modal-lead-${lead.id}`} value={String(lead.id)}>
                      {lead.fullName || lead.email}
                    </option>
                  ))}
                </select>
              </label>

              <div className="clients-modal-grid">
                <label className="clients-modal-field" htmlFor="client-modal-address">
                  <span>Address</span>
                  <input id="client-modal-address" name="address" placeholder="City, state, country" type="text" />
                </label>
                <label className="clients-modal-field" htmlFor="client-modal-billing">
                  <span>Billing Terms</span>
                  <input id="client-modal-billing" name="billingTerms" placeholder="e.g. Net 30" type="text" />
                </label>
              </div>

              <label className="clients-modal-field" htmlFor="client-modal-notes">
                <span>Notes</span>
                <textarea id="client-modal-notes" name="notes" placeholder="Any additional notes" rows={3} />
              </label>

              <div className="clients-modal-footer">
                <Link className="clients-modal-cancel" href={APP_ROUTES.internal.clients.list}>
                  Discard Draft
                </Link>
                <button className="clients-modal-submit" data-pending-label="Creating..." type="submit">
                  Initialize Client
                </button>
              </div>
            </form>
          </article>
        </section>
      ) : null}
    </section>
  )
}
