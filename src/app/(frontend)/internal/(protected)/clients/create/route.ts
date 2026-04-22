import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

const LOGO_MIME_TYPES = new Set<string>([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
])
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024
const CLIENT_COMPANY_SIZES = ['1-50', '51-200', '201-1000', '1000+'] as const
type ClientCompanySize = (typeof CLIENT_COMPANY_SIZES)[number]
const CLIENT_VISIBILITY_LEVELS = ['organization', 'businessUnit'] as const
type ClientVisibilityLevel = (typeof CLIENT_VISIBILITY_LEVELS)[number]
const CLIENT_REQUIRED_DOCUMENTS = ['msa', 'nda', 'sow', 'complianceCertificate'] as const
type ClientRequiredDocument = (typeof CLIENT_REQUIRED_DOCUMENTS)[number]

const readString = (value: FormDataEntryValue | null): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const parseNumericID = (value: FormDataEntryValue | null): number | null => {
  const raw = readString(value)

  if (!raw || !/^\d+$/.test(raw)) {
    return null
  }

  return Number(raw)
}

const parseCompanySize = (value: FormDataEntryValue | null): ClientCompanySize | undefined => {
  const raw = readString(value)

  if (!raw) {
    return undefined
  }

  if (CLIENT_COMPANY_SIZES.includes(raw as ClientCompanySize)) {
    return raw as ClientCompanySize
  }

  return undefined
}

const parseBoolean = (value: FormDataEntryValue | null): boolean =>
  readString(value).toLowerCase() === 'on' || readString(value).toLowerCase() === 'true'

const parseClientVisibilityLevel = (
  value: FormDataEntryValue | null,
): ClientVisibilityLevel | undefined => {
  const raw = readString(value)

  if (!raw) {
    return undefined
  }

  if (CLIENT_VISIBILITY_LEVELS.includes(raw as ClientVisibilityLevel)) {
    return raw as ClientVisibilityLevel
  }

  return undefined
}

const parseRequiredDocuments = (value: FormDataEntryValue[]): ClientRequiredDocument[] =>
  value
    .map((entry) => readString(entry))
    .filter((entry): entry is ClientRequiredDocument =>
      CLIENT_REQUIRED_DOCUMENTS.includes(entry as ClientRequiredDocument),
    )

const buildClientsRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.clients.list, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await getHeaders() })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const clientID = parseNumericID(formData.get('clientId'))
  const name = readString(formData.get('name'))
  const contactPerson = readString(formData.get('contactPerson'))
  const email = readString(formData.get('email'))
  const phone = readString(formData.get('phone'))
  const industry = readString(formData.get('industry'))
  const leadRecruiterID = parseNumericID(formData.get('leadRecruiterId'))
  const statusInput = readString(formData.get('status'))
  const address = readString(formData.get('address')) || undefined
  const location = readString(formData.get('location')) || undefined
  const website = readString(formData.get('website')) || undefined
  const companySize = parseCompanySize(formData.get('companySize'))
  const billingTerms = readString(formData.get('billingTerms')) || undefined
  const paymentTerms = readString(formData.get('paymentTerms')) || undefined
  const city = readString(formData.get('city')) || undefined
  const state = readString(formData.get('state')) || undefined
  const country = readString(formData.get('country')) || undefined
  const postalCode = readString(formData.get('postalCode')) || undefined
  const federalID = readString(formData.get('federalID')) || undefined
  const fax = readString(formData.get('fax')) || undefined
  const category = readString(formData.get('category')) || undefined
  const primaryBusinessUnit = readString(formData.get('primaryBusinessUnit')) || undefined
  const clientVisibilityLevel = parseClientVisibilityLevel(formData.get('clientVisibilityLevel'))
  const vmsClientName = readString(formData.get('vmsClientName')) || undefined
  const practice = readString(formData.get('practice')) || undefined
  const clientShortName = readString(formData.get('clientShortName')) || undefined
  const aboutCompany = readString(formData.get('aboutCompany')) || undefined
  const requiredDocuments = parseRequiredDocuments(formData.getAll('requiredDocuments'))
  const businessUnits = readString(formData.get('businessUnits'))
    .split(',')
    .map((unit) => unit.trim())
    .filter((unit) => unit.length > 0)
  const primaryOwnerID = parseNumericID(formData.get('primaryOwnerId'))
  const ownershipID = parseNumericID(formData.get('ownershipId'))
  const clientLeadID = parseNumericID(formData.get('clientLeadId'))
  const sendRequirement = parseBoolean(formData.get('sendRequirement'))
  const sendHotlist = parseBoolean(formData.get('sendHotlist'))
  const allowAccessToAllUsers = parseBoolean(formData.get('allowAccessToAllUsers'))
  const displayOnJob = parseBoolean(formData.get('displayOnJob'))
  const stopContactNotification = parseBoolean(formData.get('stopContactNotification'))
  const defaultJobAddress = parseBoolean(formData.get('defaultJobAddress'))
  const notes = readString(formData.get('notes')) || undefined
  const status = statusInput === 'inactive' ? 'inactive' : 'active'
  const logoInput = formData.get('logo')
  let uploadedLogoID: number | null = null

  try {
    if (logoInput instanceof File && logoInput.size > 0) {
      if (!LOGO_MIME_TYPES.has(logoInput.type)) {
        const failureURL = buildClientsRedirectURL(request)
        failureURL.searchParams.set('error', 'Client logo must be JPG, PNG, WEBP, or SVG.')
        return NextResponse.redirect(failureURL, 303)
      }

      if (logoInput.size > MAX_LOGO_SIZE_BYTES) {
        const failureURL = buildClientsRedirectURL(request)
        failureURL.searchParams.set('error', 'Client logo must be up to 5MB.')
        return NextResponse.redirect(failureURL, 303)
      }

      const logoBuffer = Buffer.from(await logoInput.arrayBuffer())
      const logoDoc = await payload.create({
        collection: 'media',
        data: {
          alt: `${name || 'Client'} logo`,
        },
        file: {
          data: logoBuffer,
          mimetype: logoInput.type,
          name: logoInput.name,
          size: logoInput.size,
        },
        overrideAccess: false,
        user: internalUser,
      })

      uploadedLogoID = logoDoc.id
    }

    if (clientID) {
      const updateData: Record<string, unknown> = {
        aboutCompany,
        allowAccessToAllUsers,
        billingTerms,
        businessUnits: businessUnits.length > 0 ? businessUnits : undefined,
        category,
        city,
        clientLead: clientLeadID ?? null,
        clientShortName,
        clientVisibilityLevel,
        country,
        defaultJobAddress,
        displayOnJob,
        fax,
        federalID,
        notes,
        ownership: ownershipID ?? null,
        owningHeadRecruiter: leadRecruiterID ?? null,
        paymentTerms,
        postalCode,
        practice,
        primaryBusinessUnit,
        primaryOwner: primaryOwnerID ?? null,
        requiredDocuments: requiredDocuments.length > 0 ? requiredDocuments : undefined,
        sendHotlist,
        sendRequirement,
        status,
        state,
        stopContactNotification,
        vmsClientName,
      }

      if (name) {
        updateData.name = name
      }

      if (contactPerson) {
        updateData.contactPerson = contactPerson
      }

      if (email) {
        updateData.email = email
      }

      if (phone) {
        updateData.phone = phone
      }

      if (industry) {
        updateData.industry = industry
      }

      if (location) {
        updateData.location = location
      }

      if (website) {
        updateData.website = website
      }

      if (companySize) {
        updateData.companySize = companySize
      }

      if (address !== undefined) {
        updateData.address = address
      }

      if (billingTerms !== undefined) {
        updateData.billingTerms = billingTerms
      }

      if (uploadedLogoID !== null) {
        updateData.logo = uploadedLogoID
      }

      await payload.update({
        collection: 'clients',
        data: updateData,
        id: clientID,
        overrideAccess: false,
        user: internalUser,
      })

      const successURL = buildClientsRedirectURL(request)
      successURL.searchParams.set('success', 'clientUpdated')
      return NextResponse.redirect(successURL, 303)
    }

    if (!name || !contactPerson || !email || !phone) {
      const failureURL = buildClientsRedirectURL(request)
      failureURL.searchParams.set(
        'error',
        'Client name, contact person, email, and phone are required.',
      )
      return NextResponse.redirect(failureURL, 303)
    }

    await payload.create({
      collection: 'clients',
      data: {
        address,
        allowAccessToAllUsers,
        businessUnits: businessUnits.length > 0 ? businessUnits : undefined,
        billingTerms,
        category,
        city,
        clientLead: clientLeadID ?? undefined,
        clientShortName,
        clientVisibilityLevel,
        companySize,
        contactPerson,
        country,
        defaultJobAddress,
        displayOnJob,
        email,
        fax,
        federalID,
        industry: industry || undefined,
        location,
        logo: uploadedLogoID ?? undefined,
        name,
        notes: notes || undefined,
        ownership: ownershipID ?? undefined,
        owningHeadRecruiter: leadRecruiterID ?? undefined,
        paymentTerms,
        phone,
        postalCode,
        practice,
        primaryBusinessUnit,
        primaryOwner: primaryOwnerID ?? undefined,
        requiredDocuments: requiredDocuments.length > 0 ? requiredDocuments : undefined,
        sendHotlist,
        sendRequirement,
        status,
        state,
        stopContactNotification,
        vmsClientName,
        website,
        aboutCompany,
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildClientsRedirectURL(request)
    successURL.searchParams.set('success', 'clientCreated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    if (uploadedLogoID !== null) {
      try {
        await payload.delete({
          collection: 'media',
          id: uploadedLogoID,
          overrideAccess: false,
          user: internalUser,
        })
      } catch {
        // noop: best effort cleanup only
      }
    }

    const failureURL = buildClientsRedirectURL(request)
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to save client. Please retry.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
