import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const parseNumericID = (value: FormDataEntryValue | null): number | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  if (!/^\d+$/.test(normalized)) {
    return null
  }

  return Number(normalized)
}

const buildRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.assignments.head, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'headRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url))
  }

  try {
    const formData = await request.formData()
    const clientID = parseNumericID(formData.get('clientId'))
    const leadRecruiterID = parseNumericID(formData.get('leadRecruiterId'))
    const notesRaw = formData.get('notes')

    if (!clientID || !leadRecruiterID) {
      const failureURL = buildRedirectURL(request)
      failureURL.searchParams.set('error', 'Missing required assignment inputs.')
      return NextResponse.redirect(failureURL)
    }

    const client = await payload.findByID({
      collection: 'clients',
      depth: 0,
      id: clientID,
      overrideAccess: false,
      user: internalUser,
    })

    const owningHeadRecruiterID = extractRelationshipID(client.owningHeadRecruiter)
    const normalizedOwningHeadRecruiterID =
      typeof owningHeadRecruiterID === 'number'
        ? owningHeadRecruiterID
        : typeof owningHeadRecruiterID === 'string' && /^\d+$/.test(owningHeadRecruiterID)
          ? Number(owningHeadRecruiterID)
          : null

    if (!normalizedOwningHeadRecruiterID) {
      const failureURL = buildRedirectURL(request)
      failureURL.searchParams.set('error', 'Selected client is missing owning head recruiter.')
      return NextResponse.redirect(failureURL)
    }

    await payload.create({
      collection: 'client-lead-assignments',
      data: {
        client: clientID,
        headRecruiter: normalizedOwningHeadRecruiterID,
        leadRecruiter: leadRecruiterID,
        notes: typeof notesRaw === 'string' && notesRaw.trim() ? notesRaw.trim() : undefined,
        status: 'active',
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildRedirectURL(request)
    successURL.searchParams.set('success', 'clientAssignmentCreated')
    return NextResponse.redirect(successURL)
  } catch (error) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to assign client.')
    return NextResponse.redirect(failureURL)
  }
}
