import configPromise from '@payload-config'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'

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

const readLogo = (
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
    alt: typeof typed.alt === 'string' ? typed.alt : 'Client logo',
    url: typeof typed.url === 'string' ? typed.url : null,
  }
}

const formatDateTime = (value: string | undefined): string => {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type ClientDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const { id } = await params

  if (!/^\d+$/.test(id)) {
    notFound()
  }

  const clientID = Number(id)

  try {
    const [client, jobs] = await Promise.all([
      payload.findByID({
        collection: 'clients',
        depth: 1,
        id: clientID,
        overrideAccess: false,
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
        user,
      }),
      payload.find({
        collection: 'jobs',
        depth: 1,
        limit: 100,
        overrideAccess: false,
        pagination: false,
        select: {
          id: true,
          location: true,
          openings: true,
          priority: true,
          status: true,
          title: true,
          updatedAt: true,
        },
        sort: '-updatedAt',
        user,
        where: {
          client: {
            equals: clientID,
          },
        },
      }),
    ])

    const logo = readLogo(client.logo)

    return (
      <section className="client-detail-page">
        <header className="client-detail-header">
          <div className="client-detail-title-wrap">
              <div className="client-detail-logo-wrap">
              {logo.url ? (
                <Image alt={logo.alt} className="client-detail-logo" height={42} src={logo.url} width={42} />
              ) : (
                <span>{client.name.slice(0, 2).toUpperCase()}</span>
              )}
              </div>
            <div>
              <p className="client-detail-kicker">Client Profile</p>
              <h1>{client.name}</h1>
              <p>
                {client.industry || 'Industry not set'} · {client.location || 'Location not set'} · Updated {formatDateTime(client.updatedAt)}
              </p>
            </div>
          </div>

          <div className="client-detail-actions">
            <Link className="client-detail-btn" href={APP_ROUTES.internal.clients.list}>
              Back
            </Link>
            <Link className="client-detail-btn client-detail-btn-primary" href={`${APP_ROUTES.internal.jobs.assigned}?client=${client.id}`}>
              Jobs
            </Link>
          </div>
        </header>

        <div className="client-detail-grid">
          <article className="client-detail-card">
            <h2>Primary Information</h2>
            <div className="client-detail-info-grid">
              <p><span>Contact Person</span>{client.contactPerson}</p>
              <p><span>Email</span>{client.email}</p>
              <p><span>Phone</span>{client.phone}</p>
              <p><span>Lead Recruiter</span>{readLabel(client.owningHeadRecruiter, 'Unassigned')}</p>
              <p><span>Status</span>{client.status === 'active' ? 'Active' : 'Inactive'}</p>
              <p><span>Company Size</span>{client.companySize || 'Not set'}</p>
            </div>
          </article>

          <article className="client-detail-card">
            <h2>Business Notes</h2>
            <div className="client-detail-text-block">
              <p><span>Website</span>{client.website || 'Not set'}</p>
              <p><span>Address</span>{client.address || 'Not set'}</p>
              <p><span>Billing Terms</span>{client.billingTerms || 'Not set'}</p>
              <p><span>Notes</span>{client.notes || 'Not set'}</p>
            </div>
          </article>
        </div>

        <article className="client-detail-card">
          <div className="client-detail-jobs-head">
            <h2>Linked Jobs ({jobs.docs.length})</h2>
            <Link href={`${APP_ROUTES.internal.jobs.assigned}?client=${client.id}`}>Open Jobs Board</Link>
          </div>

          {jobs.docs.length === 0 ? (
            <p className="client-detail-empty">No jobs mapped to this client yet.</p>
          ) : (
            <div className="client-detail-jobs-grid">
              {jobs.docs.map((job) => (
                <article className="client-detail-job-card" key={`client-job-${job.id}`}>
                  <p>{job.title}</p>
                  <small>{job.location || 'Location not set'}</small>
                  <small>Openings: {job.openings ?? 0}</small>
                  <small>Priority: {job.priority || 'medium'}</small>
                  <small>Status: {job.status || 'inactive'}</small>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    )
  } catch {
    notFound()
  }
}
