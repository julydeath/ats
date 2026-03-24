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

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as { email?: string; fullName?: string; name?: string }
    return typed.fullName || typed.name || typed.email || fallback
  }

  return fallback
}

type ClientsPageProps = {
  searchParams?: Promise<{
    error?: string
    success?: string
  }>
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const user = await requireInternalRole(['admin'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}

  const [clients, leads] = await Promise.all([
    payload.find({
      collection: 'clients',
      depth: 1,
      limit: 200,
      pagination: false,
      overrideAccess: false,
      select: {
        address: true,
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

  const activeClients = clients.docs.filter((client) => client.status === 'active')
  const inactiveClients = clients.docs.filter((client) => client.status !== 'active')
  const unassignedClients = clients.docs.filter((client) => !extractRelationshipID(client.owningHeadRecruiter))
  const successMessage =
    resolvedSearchParams.success === 'clientCreated'
      ? 'Client created successfully.'
      : resolvedSearchParams.success === 'clientUpdated'
        ? 'Client details updated successfully.'
        : ''

  return (
    <section className="clients-workspace">
      <article className="clients-hero-card">
        <div className="clients-hero-copy">
          <p className="eyebrow">Admin Workspace</p>
          <h1>Client Management</h1>
          <p className="panel-intro">
            Create clean client records, assign primary lead owners, and maintain statuses from one screen.
          </p>
        </div>
        <div className="clients-hero-actions">
          <Link className="button button-secondary" href={APP_ROUTES.internal.assignments.head}>
            Open Ownership Desk
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.internal.jobs.assigned}>
            View Jobs
          </Link>
        </div>
        {successMessage ? <p className="clients-feedback clients-feedback-success">{successMessage}</p> : null}
        {resolvedSearchParams.error ? (
          <p className="clients-feedback clients-feedback-error">{resolvedSearchParams.error}</p>
        ) : null}
      </article>

      <div className="clients-kpi-grid">
        <article className="clients-kpi-tile clients-kpi-tile-blue">
          <p className="clients-kpi-title">Total Clients</p>
          <p className="clients-kpi-value">{clients.docs.length}</p>
          <p className="clients-kpi-meta">Master records in system</p>
        </article>
        <article className="clients-kpi-tile clients-kpi-tile-green">
          <p className="clients-kpi-title">Active</p>
          <p className="clients-kpi-value">{activeClients.length}</p>
          <p className="clients-kpi-meta">Currently hiring</p>
        </article>
        <article className="clients-kpi-tile clients-kpi-tile-slate">
          <p className="clients-kpi-title">Inactive</p>
          <p className="clients-kpi-value">{inactiveClients.length}</p>
          <p className="clients-kpi-meta">Paused or closed</p>
        </article>
        <article className="clients-kpi-tile clients-kpi-tile-purple">
          <p className="clients-kpi-title">Unassigned Lead</p>
          <p className="clients-kpi-value">{unassignedClients.length}</p>
          <p className="clients-kpi-meta">Needs ownership allocation</p>
        </article>
      </div>

      <div className="clients-main-grid">
        <article className="clients-card clients-create-card">
          <div className="clients-card-head">
            <h2>Create New Client</h2>
            <p>Start with required details, then add billing and operational notes.</p>
          </div>

          <form action={APP_ROUTES.internal.clients.create} className="clients-form" method="post">
            <div className="clients-form-grid">
              <label className="clients-field" htmlFor="client-name">
                <span className="clients-label">Client Name</span>
                <input className="input clients-input" id="client-name" name="name" required type="text" />
              </label>

              <label className="clients-field" htmlFor="client-contact-person">
                <span className="clients-label">Contact Person</span>
                <input
                  className="input clients-input"
                  id="client-contact-person"
                  name="contactPerson"
                  required
                  type="text"
                />
              </label>

              <label className="clients-field" htmlFor="client-email">
                <span className="clients-label">Email</span>
                <input className="input clients-input" id="client-email" name="email" required type="email" />
              </label>

              <label className="clients-field" htmlFor="client-phone">
                <span className="clients-label">Phone</span>
                <input className="input clients-input" id="client-phone" name="phone" required type="text" />
              </label>

              <label className="clients-field" htmlFor="client-primary-lead">
                <span className="clients-label">Primary Lead Recruiter</span>
                <select
                  className="input clients-input"
                  defaultValue=""
                  id="client-primary-lead"
                  name="leadRecruiterId"
                >
                  <option value="">No primary lead</option>
                  {leads.docs.map((lead) => (
                    <option key={`client-new-lead-${lead.id}`} value={String(lead.id)}>
                      {lead.fullName || lead.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="clients-field" htmlFor="client-status">
                <span className="clients-label">Status</span>
                <select className="input clients-input" defaultValue="active" id="client-status" name="status">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="clients-form-grid clients-form-grid-secondary">
              <label className="clients-field" htmlFor="client-address">
                <span className="clients-label">Address</span>
                <textarea className="input clients-input clients-textarea" id="client-address" name="address" rows={3} />
              </label>
              <label className="clients-field" htmlFor="client-billing-terms">
                <span className="clients-label">Billing Terms</span>
                <textarea
                  className="input clients-input clients-textarea"
                  id="client-billing-terms"
                  name="billingTerms"
                  rows={3}
                />
              </label>
            </div>

            <label className="clients-field" htmlFor="client-notes">
              <span className="clients-label">Notes</span>
              <textarea className="input clients-input clients-textarea" id="client-notes" name="notes" rows={3} />
            </label>

            <div className="clients-form-footer">
              <p className="clients-form-hint">Duplicate checks run automatically on name, email, and phone.</p>
              <button className="button" data-pending-label="Saving..." type="submit">
                Create Client
              </button>
            </div>
          </form>
        </article>

        <aside className="clients-card clients-side-card">
          <h3>What Admin Controls Here</h3>
          <ul className="clients-side-list">
            <li>Create and activate/deactivate client records.</li>
            <li>Set primary lead ownership for each client.</li>
            <li>Maintain contact/billing notes for recruiters.</li>
          </ul>
          <div className="clients-side-links">
            <Link className="button button-secondary" href={APP_ROUTES.internal.assignments.head}>
              Manage Assignments
            </Link>
            <Link className="button button-secondary" href={APP_ROUTES.internal.schedule}>
              Open Schedule
            </Link>
          </div>
        </aside>
      </div>

      <article className="clients-card clients-directory-card">
        <div className="clients-card-head">
          <h2>Client Directory</h2>
          <p>Update ownership, status, and notes without leaving this page.</p>
        </div>

        {clients.docs.length === 0 ? (
          <p className="clients-empty-state">No clients available yet. Create your first client using the form above.</p>
        ) : (
          <div className="client-records">
            {clients.docs.map((client) => (
              <section className="client-record" key={`client-record-${client.id}`}>
                <div className="client-record-head">
                  <div>
                    <h3>{client.name}</h3>
                    <p className="client-record-contact">
                      {client.contactPerson} | {client.email} | {client.phone}
                    </p>
                  </div>
                  <div className="client-record-meta">
                    <span
                      className={`client-status-pill ${
                        client.status === 'active' ? 'client-status-pill-active' : 'client-status-pill-inactive'
                      }`}
                    >
                      {client.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    <p>Updated {new Date(client.updatedAt).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="client-record-info">
                  <p>
                    <span>Address</span>
                    {client.address || 'Not provided'}
                  </p>
                  <p>
                    <span>Primary Lead</span>
                    {readLabel(client.owningHeadRecruiter, 'Not assigned')}
                  </p>
                </div>

                <form action={APP_ROUTES.internal.clients.create} className="client-edit-form" method="post">
                  <input name="clientId" type="hidden" value={String(client.id)} />
                  <label className="clients-field">
                    <span className="clients-label">Primary Lead</span>
                    <select
                      className="input clients-input clients-input-compact"
                      defaultValue={String(extractRelationshipID(client.owningHeadRecruiter) || '')}
                      name="leadRecruiterId"
                    >
                      <option value="">No primary lead</option>
                      {leads.docs.map((lead) => (
                        <option key={`client-row-lead-${client.id}-${lead.id}`} value={String(lead.id)}>
                          {lead.fullName || lead.email}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="clients-field">
                    <span className="clients-label">Status</span>
                    <select
                      className="input clients-input clients-input-compact"
                      defaultValue={client.status}
                      name="status"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>

                  <label className="clients-field">
                    <span className="clients-label">Notes</span>
                    <input
                      className="input clients-input clients-input-compact"
                      defaultValue={client.notes || ''}
                      name="notes"
                      placeholder="Add update note"
                      type="text"
                    />
                  </label>

                  <button className="button button-secondary" data-pending-label="Saving..." type="submit">
                    Save
                  </button>
                </form>
              </section>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
