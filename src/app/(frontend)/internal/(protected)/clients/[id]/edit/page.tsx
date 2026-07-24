import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const CLIENT_SIZE_OPTIONS = [
  { label: '1-50', value: '1-50' },
  { label: '51-200', value: '51-200' },
  { label: '201-1000', value: '201-1000' },
  { label: '1000+', value: '1000+' },
] as const

const CLIENT_VISIBILITY_OPTIONS = [
  { label: 'Organization Level', value: 'organization' },
  { label: 'Business Unit', value: 'businessUnit' },
] as const

const CLIENT_REQUIRED_DOCUMENT_OPTIONS = [
  { label: 'MSA', value: 'msa' },
  { label: 'NDA', value: 'nda' },
  { label: 'SOW', value: 'sow' },
  { label: 'Compliance Certificate', value: 'complianceCertificate' },
] as const

const toRelationshipID = (value: unknown): string => {
  const id = extractRelationshipID(value)
  return typeof id === 'number' || typeof id === 'string' ? String(id) : ''
}

const toDefaultText = (value: string | number | null | undefined): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return typeof value === 'string' ? value : ''
}

const toCSV = (value: string[] | null | undefined): string =>
  Array.isArray(value) ? value.filter(Boolean).join(', ') : ''

type ClientEditPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function ClientEditPage({ params, searchParams }: ClientEditPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter'])
  const payload = await getPayload({ config: configPromise })
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}

  if (!/^\d+$/.test(id)) {
    notFound()
  }

  const clientID = Number(id)

  try {
    const [client, leadsResult, activeUsersResult] = await Promise.all([
      payload.findByID({
        collection: 'clients',
        depth: 0,
        id: clientID,
        overrideAccess: false,
        select: {
          aboutCompany: true,
          address: true,
          allowAccessToAllUsers: true,
          billingTerms: true,
          businessUnits: true,
          category: true,
          city: true,
          clientCode: true,
          clientLead: true,
          clientShortName: true,
          clientVisibilityLevel: true,
          companySize: true,
          contactPerson: true,
          country: true,
          defaultJobAddress: true,
          displayOnJob: true,
          email: true,
          fax: true,
          federalID: true,
          id: true,
          industry: true,
          location: true,
          name: true,
          notes: true,
          ownership: true,
          owningHeadRecruiter: true,
          paymentTerms: true,
          phone: true,
          postalCode: true,
          practice: true,
          primaryBusinessUnit: true,
          primaryOwner: true,
          requiredDocuments: true,
          sendHotlist: true,
          sendRequirement: true,
          state: true,
          status: true,
          stopContactNotification: true,
          vmsClientName: true,
          website: true,
        },
        user,
      }),
      payload.find({
        collection: 'users',
        depth: 0,
        limit: 140,
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
      payload.find({
        collection: 'users',
        depth: 0,
        limit: 180,
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
          isActive: {
            equals: true,
          },
        },
      }),
    ])

    const leadOptions = leadsResult.docs
    const activeUsers = activeUsersResult.docs
    const selectedLeadID = toRelationshipID(client.owningHeadRecruiter)
    const selectedPrimaryOwnerID = toRelationshipID(client.primaryOwner)
    const selectedOwnershipID = toRelationshipID(client.ownership)
    const selectedClientLeadID = toRelationshipID(client.clientLead)
    const selectedRequiredDocuments = Array.isArray(client.requiredDocuments)
      ? client.requiredDocuments.filter(Boolean)
      : []

    return (
      <section className="clients-grid-page clients-edit-page">
        <header className="clients-grid-header">
          <div>
            <p className="clients-grid-kicker">Clients | Edit</p>
            <h1>Edit {client.name}</h1>
            <p>{client.clientCode || `CLT-${client.id}`} · Update account, ownership, and business terms.</p>
          </div>
          <div className="clients-grid-header-actions">
            <Link className="clients-grid-header-btn" href={`${APP_ROUTES.internal.clients.detailBase}/${client.id}`}>
              Back to Client
            </Link>
          </div>
        </header>

        {resolvedSearchParams.error ? (
          <p className="clients-grid-feedback clients-grid-feedback-error">{resolvedSearchParams.error}</p>
        ) : null}

        <article className="clients-create-modal clients-edit-panel">
          <div className="clients-create-modal-head">
            <div>
              <h2>Client Details</h2>
              <p>Update branding, primary ownership, and business details.</p>
            </div>
          </div>

          <form
            action={APP_ROUTES.internal.clients.create}
            className="clients-create-modal-form"
            encType="multipart/form-data"
            method="post"
          >
            <input name="clientId" type="hidden" value={client.id} />

            <label>
              <span>Organization Name *</span>
              <input defaultValue={client.name} name="name" required type="text" />
            </label>

            <div className="clients-create-modal-grid">
              <label>
                <span>Client Short Name</span>
                <input defaultValue={toDefaultText(client.clientShortName)} name="clientShortName" type="text" />
              </label>
              <label>
                <span>Category</span>
                <input defaultValue={toDefaultText(client.category)} name="category" type="text" />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Contact Person *</span>
                <input defaultValue={client.contactPerson} name="contactPerson" required type="text" />
              </label>
              <label>
                <span>Phone *</span>
                <input defaultValue={client.phone} name="phone" required type="text" />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Contact Email *</span>
                <input defaultValue={client.email} name="email" required type="email" />
              </label>
              <label>
                <span>Status</span>
                <select defaultValue={client.status || 'active'} name="status">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Industry</span>
                <input defaultValue={toDefaultText(client.industry)} name="industry" type="text" />
              </label>
              <label>
                <span>Company Size</span>
                <select defaultValue={client.companySize || ''} name="companySize">
                  <option value="">Select size</option>
                  {CLIENT_SIZE_OPTIONS.map((option) => (
                    <option key={`edit-company-size-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Location</span>
                <input defaultValue={toDefaultText(client.location)} name="location" type="text" />
              </label>
              <label>
                <span>Website</span>
                <input defaultValue={toDefaultText(client.website)} name="website" type="url" />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>City</span>
                <input defaultValue={toDefaultText(client.city)} name="city" type="text" />
              </label>
              <label>
                <span>State</span>
                <input defaultValue={toDefaultText(client.state)} name="state" type="text" />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Country</span>
                <input defaultValue={toDefaultText(client.country) || 'India'} name="country" type="text" />
              </label>
              <label>
                <span>Postal Code</span>
                <input defaultValue={toDefaultText(client.postalCode)} name="postalCode" type="text" />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Federal ID / Tax ID</span>
                <input defaultValue={toDefaultText(client.federalID)} name="federalID" type="text" />
              </label>
              <label>
                <span>Fax</span>
                <input defaultValue={toDefaultText(client.fax)} name="fax" type="text" />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Primary Business Unit</span>
                <input defaultValue={toDefaultText(client.primaryBusinessUnit)} name="primaryBusinessUnit" type="text" />
              </label>
              <label>
                <span>Business Units (comma-separated)</span>
                <input defaultValue={toCSV(client.businessUnits)} name="businessUnits" type="text" />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Client Visibility</span>
                <select defaultValue={client.clientVisibilityLevel || 'organization'} name="clientVisibilityLevel">
                  {CLIENT_VISIBILITY_OPTIONS.map((option) => (
                    <option key={`edit-client-visibility-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>VMS Client Name</span>
                <input defaultValue={toDefaultText(client.vmsClientName)} name="vmsClientName" type="text" />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Practice</span>
                <input defaultValue={toDefaultText(client.practice)} name="practice" type="text" />
              </label>
              <label>
                <span>Payment Terms</span>
                <input defaultValue={toDefaultText(client.paymentTerms)} name="paymentTerms" type="text" />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Assigned Lead</span>
                <select defaultValue={selectedLeadID} name="leadRecruiterId">
                  <option value="">Unassigned</option>
                  {leadOptions.map((lead) => (
                    <option key={`edit-lead-${lead.id}`} value={String(lead.id)}>
                      {lead.fullName || lead.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Replace Logo</span>
                <input accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" name="logo" type="file" />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Primary Owner</span>
                <select defaultValue={selectedPrimaryOwnerID} name="primaryOwnerId">
                  <option value="">Unassigned</option>
                  {activeUsers.map((member) => (
                    <option key={`edit-primary-owner-${member.id}`} value={String(member.id)}>
                      {member.fullName || member.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Ownership</span>
                <select defaultValue={selectedOwnershipID} name="ownershipId">
                  <option value="">Unassigned</option>
                  {activeUsers.map((member) => (
                    <option key={`edit-ownership-${member.id}`} value={String(member.id)}>
                      {member.fullName || member.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Client Lead</span>
                <select defaultValue={selectedClientLeadID} name="clientLeadId">
                  <option value="">Unassigned</option>
                  {leadOptions.map((lead) => (
                    <option key={`edit-client-lead-${lead.id}`} value={String(lead.id)}>
                      {lead.fullName || lead.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Required Documents</span>
                <select defaultValue={selectedRequiredDocuments} multiple name="requiredDocuments" size={4}>
                  {CLIENT_REQUIRED_DOCUMENT_OPTIONS.map((option) => (
                    <option key={`edit-required-doc-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>Address</span>
                <textarea defaultValue={toDefaultText(client.address)} name="address" rows={2} />
              </label>
              <label>
                <span>Billing Terms</span>
                <textarea defaultValue={toDefaultText(client.billingTerms)} name="billingTerms" rows={2} />
              </label>
            </div>

            <div className="clients-create-modal-grid">
              <label>
                <span>About Company</span>
                <textarea defaultValue={toDefaultText(client.aboutCompany)} name="aboutCompany" rows={3} />
              </label>
              <div className="clients-create-modal-field-block">
                <span>Platform Controls</span>
                <div className="clients-create-modal-flags">
                  <label><input defaultChecked={client.sendRequirement !== false} name="sendRequirement" type="checkbox" /> Send Requirement</label>
                  <label><input defaultChecked={client.sendHotlist !== false} name="sendHotlist" type="checkbox" /> Send Hotlist</label>
                  <label><input defaultChecked={client.allowAccessToAllUsers === true} name="allowAccessToAllUsers" type="checkbox" /> Allow Access To All Users</label>
                  <label><input defaultChecked={client.displayOnJob !== false} name="displayOnJob" type="checkbox" /> Display On Job</label>
                  <label><input defaultChecked={client.stopContactNotification === true} name="stopContactNotification" type="checkbox" /> Stop Contact Notification</label>
                  <label><input defaultChecked={client.defaultJobAddress === true} name="defaultJobAddress" type="checkbox" /> Use Address As Default Job Address</label>
                </div>
              </div>
            </div>

            <label>
              <span>Notes</span>
              <textarea defaultValue={toDefaultText(client.notes)} name="notes" rows={3} />
            </label>

            <div className="clients-create-modal-footer">
              <Link className="clients-create-modal-cancel" href={`${APP_ROUTES.internal.clients.detailBase}/${client.id}`}>
                Cancel
              </Link>
              <button className="clients-create-modal-submit" data-pending-label="Saving..." type="submit">
                Update Client
              </button>
            </div>
          </form>
        </article>
      </section>
    )
  } catch {
    notFound()
  }
}
