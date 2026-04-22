import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { APIError, getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

const buildRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.team.base, request.url)

const readString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.trim() : ''

const readNumber = (value: FormDataEntryValue | null): number | null => {
  const raw = readString(value)
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: request.headers })
  const actor = auth.user as InternalUserLike

  if (!actor || !hasInternalRole(actor, ['admin'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  try {
    const formData = await request.formData()
    const shiftId = readNumber(formData.get('shiftId'))

    if (!shiftId) {
      throw new APIError('Shift ID is required.', 400)
    }

    const dependencies = await payload.count({
      collection: 'employee-profiles',
      overrideAccess: false,
      user: actor,
      where: {
        attendanceShift: {
          equals: shiftId,
        },
      },
    })

    if (dependencies.totalDocs > 0) {
      throw new APIError('Shift is assigned to employees. Reassign them before deletion.', 409)
    }

    await payload.delete({
      collection: 'attendance-shifts',
      id: shiftId,
      overrideAccess: false,
      user: actor,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'shiftRemoved')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to delete shift.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
