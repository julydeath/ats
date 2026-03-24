import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

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

const buildClientsRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.clients.list, request.url)

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
  const billingTerms = readString(formData.get('billingTerms')) || undefined
  const notes = readString(formData.get('notes')) || undefined
  const status = statusInput === 'inactive' ? 'inactive' : 'active'

  try {
    if (clientID) {
      await payload.update({
        collection: 'clients',
        data: {
          notes,
          owningHeadRecruiter: leadRecruiterID ?? null,
          status,
        },
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
      failureURL.searchParams.set('error', 'Client name, contact person, email, and phone are required.')
      return NextResponse.redirect(failureURL, 303)
    }

    const mergedNotes = [industry ? `Industry: ${industry}` : '', notes || ''].filter(Boolean).join('\n')

    await payload.create({
      collection: 'clients',
      data: {
        address,
        billingTerms,
        contactPerson,
        email,
        name,
        notes: mergedNotes || undefined,
        owningHeadRecruiter: leadRecruiterID ?? undefined,
        phone,
        status,
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildClientsRedirectURL(request)
    successURL.searchParams.set('success', 'clientCreated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildClientsRedirectURL(request)
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to save client. Please retry.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
