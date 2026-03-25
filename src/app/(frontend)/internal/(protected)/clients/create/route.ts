import configPromise from '@payload-config'
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

const buildClientsRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.clients.list, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin'])) {
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
        notes,
        owningHeadRecruiter: leadRecruiterID ?? null,
        status,
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
        billingTerms,
        companySize,
        contactPerson,
        email,
        industry: industry || undefined,
        location,
        logo: uploadedLogoID ?? undefined,
        name,
        notes: notes || undefined,
        owningHeadRecruiter: leadRecruiterID ?? undefined,
        phone,
        status,
        website,
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
