import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.team.base, request.url)

const readString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.trim() : ''

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: request.headers })
  const actor = auth.user as InternalUserLike

  if (!actor || !hasInternalRole(actor, ['admin'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  try {
    const formData = await request.formData()
    const userIDRaw = readString(formData.get('userId'))
    const activate = readString(formData.get('activate')) === '1'

    if (!/^\d+$/.test(userIDRaw)) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Valid user ID is required.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const userID = Number(userIDRaw)

    await payload.update({
      collection: 'users',
      data: {
        isActive: activate,
      },
      id: userID,
      overrideAccess: false,
      user: actor,
    })

    const employeeProfile = await payload.find({
      collection: 'employee-profiles',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      pagination: false,
      user: actor,
      where: {
        user: {
          equals: userID,
        },
      },
    })

    if (employeeProfile.docs[0]?.id) {
      await payload.update({
        collection: 'employee-profiles',
        data: {
          employmentStatus: activate ? 'active' : 'inactive',
        },
        id: employeeProfile.docs[0].id,
        overrideAccess: false,
        user: actor,
      })
    }

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', activate ? 'memberActivated' : 'memberDeactivated')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to update member status.',
    )
    return NextResponse.redirect(redirectURL, 303)
  }
}
