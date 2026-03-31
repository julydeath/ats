import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { PLACEMENT_STATUSES, type PlacementStatus } from '@/lib/constants/recruitment'
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

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.placements.list, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const placementID = parseNumericID(formData.get('placementId'))
  const statusInput = readString(formData.get('status'))

  if (!placementID) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('error', 'Valid placement ID is required.')
    return NextResponse.redirect(failureURL, 303)
  }

  if (!PLACEMENT_STATUSES.includes(statusInput as PlacementStatus)) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('error', 'Invalid placement status selected.')
    return NextResponse.redirect(failureURL, 303)
  }

  try {
    await payload.update({
      collection: 'placements',
      data: {
        status: statusInput as PlacementStatus,
      },
      id: placementID,
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildRedirectURL(request)
    successURL.searchParams.set('success', 'placementStatusUpdated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to update placement status.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
