import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { JOB_EMPLOYMENT_TYPE_OPTIONS, JOB_PRIORITY_OPTIONS } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

const PAGE_SIZE = 10

const readLabel = (value: unknown, fallback: string = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as { fullName?: string; email?: string; name?: string }
    return typed.fullName || typed.name || typed.email || fallback
  }

  return fallback
}

const buildQuery = ({ page, q }: { page: number; q: string }) => {
  const params = new URLSearchParams()

  if (q) {
    params.set('q', q)
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

type JobTemplatesPageProps = {
  searchParams?: Promise<{
    create?: string
    error?: string
    page?: string
    q?: string
    success?: string
  }>
}

export default async function JobTemplatesPage({ searchParams }: JobTemplatesPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) ?? {}

  const canManageTemplates = user.role === 'admin' || user.role === 'leadRecruiter'
  const search = String(resolvedSearchParams.q || '').trim()
  const page = Math.max(Number.parseInt(String(resolvedSearchParams.page || '1'), 10) || 1, 1)
  const isCreateOpen = resolvedSearchParams.create === '1'

  const [templatesResult, leadsResult] = await Promise.all([
    payload.find({
      collection: 'job-templates',
      depth: 1,
      limit: PAGE_SIZE,
      overrideAccess: false,
      page,
      select: {
        createdAt: true,
        description: true,
        employmentType: true,
        id: true,
        isActive: true,
        location: true,
        ownedByLeadRecruiter: true,
        priority: true,
        templateCode: true,
        templateName: true,
        title: true,
        updatedAt: true,
      },
      sort: '-updatedAt',
      user,
      where: search
        ? {
            or: [
              {
                templateName: {
                  contains: search,
                },
              },
              {
                title: {
                  contains: search,
                },
              },
              {
                location: {
                  contains: search,
                },
              },
            ],
          }
        : undefined,
    }),
    canManageTemplates
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
      : Promise.resolve({ docs: [] as Array<{ email?: string; fullName?: string; id: number | string }> }),
  ])

  const currentPage = templatesResult.page || 1
  const totalPages = Math.max(templatesResult.totalPages || 1, 1)

  return (
    <section className="jobs-workspace-page">
      <header className="jobs-workspace-header">
        <div>
          <p className="jobs-workspace-breadcrumb">Workspace / Job Templates</p>
          <h1>Job Templates</h1>
          <p>Create reusable requisition templates for faster, consistent job intake.</p>
        </div>
        <div className="jobs-workspace-header-actions">
          <form className="jobs-workspace-search" method="get">
            <input defaultValue={search} name="q" placeholder="Search template" type="search" />
            <button type="submit">Search</button>
          </form>
          {canManageTemplates ? (
            <Link className="jobs-workspace-create" href={`${APP_ROUTES.internal.jobs.templates}?create=1`}>
              + New Template
            </Link>
          ) : null}
        </div>
      </header>

      {resolvedSearchParams.success ? (
        <p className="jobs-workspace-feedback jobs-workspace-feedback-success">Job template saved successfully.</p>
      ) : null}
      {resolvedSearchParams.error ? (
        <p className="jobs-workspace-feedback jobs-workspace-feedback-error">{resolvedSearchParams.error}</p>
      ) : null}

      <article className="jobs-workspace-table-card">
        <table className="jobs-workspace-table">
          <thead>
            <tr>
              <th>Template</th>
              <th>Role Defaults</th>
              <th>Lead Owner</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {templatesResult.docs.length === 0 ? (
              <tr>
                <td className="jobs-workspace-empty" colSpan={5}>
                  No templates found.
                </td>
              </tr>
            ) : (
              templatesResult.docs.map((template) => (
                <tr key={`template-${template.id}`}>
                  <td>
                    <div className="jobs-workspace-cell-title">
                      <strong>{template.templateName}</strong>
                      <small>{template.templateCode || `JTPL-${template.id}`}</small>
                    </div>
                  </td>
                  <td>
                    <div className="jobs-workspace-cell-meta">
                      <span>{template.title}</span>
                      <small>
                        {String(template.employmentType || 'N/A')} · {template.location || 'No location'} · {String(template.priority || 'medium')}
                      </small>
                    </div>
                  </td>
                  <td>{readLabel(template.ownedByLeadRecruiter, 'Unassigned')}</td>
                  <td>
                    <span className={`jobs-workspace-status ${template.isActive ? 'jobs-workspace-status-open' : 'jobs-workspace-status-closed'}`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(template.updatedAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <footer className="jobs-workspace-pagination">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div>
            <Link
              className={currentPage <= 1 ? 'jobs-workspace-page-btn jobs-workspace-page-btn-disabled' : 'jobs-workspace-page-btn'}
              href={`${APP_ROUTES.internal.jobs.templates}${buildQuery({ page: Math.max(currentPage - 1, 1), q: search })}`}
            >
              Prev
            </Link>
            <Link
              className={currentPage >= totalPages ? 'jobs-workspace-page-btn jobs-workspace-page-btn-disabled' : 'jobs-workspace-page-btn'}
              href={`${APP_ROUTES.internal.jobs.templates}${buildQuery({ page: Math.min(currentPage + 1, totalPages), q: search })}`}
            >
              Next
            </Link>
          </div>
        </footer>
      </article>

      {canManageTemplates && isCreateOpen ? (
        <div className="jobs-workspace-modal-wrap">
          <div className="jobs-workspace-modal-backdrop" />
          <div className="jobs-workspace-modal">
            <header>
              <h2>Create Job Template</h2>
              <Link href={APP_ROUTES.internal.jobs.templates}>×</Link>
            </header>
            <form action={APP_ROUTES.internal.jobs.templatesCreate} method="post">
              <div className="jobs-workspace-modal-grid">
                <label>
                  <span>Template Name *</span>
                  <input name="templateName" required type="text" />
                </label>
                <label>
                  <span>Role Title *</span>
                  <input name="title" required type="text" />
                </label>
                <label>
                  <span>Employment Type *</span>
                  <select defaultValue="fullTime" name="employmentType" required>
                    {JOB_EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                      <option key={`tpl-employment-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Priority *</span>
                  <select defaultValue="medium" name="priority" required>
                    {JOB_PRIORITY_OPTIONS.map((option) => (
                      <option key={`tpl-priority-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Department</span>
                  <input name="department" type="text" />
                </label>
                <label>
                  <span>Business Unit</span>
                  <input name="businessUnit" type="text" />
                </label>
                <label>
                  <span>Location</span>
                  <input name="location" type="text" />
                </label>
                <label>
                  <span>Openings</span>
                  <input min={1} name="openings" type="number" />
                </label>
                <label>
                  <span>Experience Min</span>
                  <input min={0} name="experienceMin" type="number" />
                </label>
                <label>
                  <span>Experience Max</span>
                  <input min={0} name="experienceMax" type="number" />
                </label>
                <label>
                  <span>Salary Min</span>
                  <input min={0} name="salaryMin" type="number" />
                </label>
                <label>
                  <span>Salary Max</span>
                  <input min={0} name="salaryMax" type="number" />
                </label>
                <label>
                  <span>Lead Owner</span>
                  <select defaultValue="" name="ownedByLeadRecruiter">
                    <option value="">Unassigned</option>
                    {leadsResult.docs.map((lead) => (
                      <option key={`lead-${lead.id}`} value={String(lead.id)}>
                        {lead.fullName || lead.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select defaultValue="active" name="isActive">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="jobs-workspace-modal-span-2">
                  <span>Required Skills</span>
                  <input name="requiredSkills" placeholder="React, Node.js, PostgreSQL" type="text" />
                </label>
                <label className="jobs-workspace-modal-span-2">
                  <span>Description *</span>
                  <textarea name="description" required rows={4} />
                </label>
              </div>

              <footer>
                <Link href={APP_ROUTES.internal.jobs.templates}>Cancel</Link>
                <button type="submit">Save Template</button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
