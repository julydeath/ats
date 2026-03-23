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

const parseStatus = (value: FormDataEntryValue | null): 'active' | 'inactive' => {
  if (typeof value !== 'string') {
    return 'active'
  }

  const normalized = value.trim()
  return normalized === 'inactive' ? 'inactive' : 'active'
}

const readOptionalText = (value: FormDataEntryValue | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized || undefined
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
    const assignmentID = parseNumericID(formData.get('assignmentId'))
    const clientID = parseNumericID(formData.get('clientId'))
    const leadRecruiterID = parseNumericID(formData.get('leadRecruiterId'))
    const notes = readOptionalText(formData.get('notes'))
    const status = parseStatus(formData.get('status'))

    if (assignmentID) {
      if (!leadRecruiterID) {
        const failureURL = buildRedirectURL(request)
        failureURL.searchParams.set('error', 'Lead recruiter is required to update assignment.')
        return NextResponse.redirect(failureURL)
      }

      await payload.update({
        collection: 'client-lead-assignments',
        data: {
          leadRecruiter: leadRecruiterID,
          notes,
          status,
        },
        id: assignmentID,
        overrideAccess: false,
        user: internalUser,
      })

      const successURL = buildRedirectURL(request)
      successURL.searchParams.set('success', 'clientAssignmentUpdated')
      return NextResponse.redirect(successURL)
    }

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
        notes,
        status,
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
