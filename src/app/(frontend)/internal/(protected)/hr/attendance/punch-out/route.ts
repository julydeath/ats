import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { getOpenAttendanceSession } from '@/lib/hr/attendance'
import { APP_ROUTES } from '@/lib/constants/routes'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.hr.attendance, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const authResult = await payload.auth({ headers: request.headers })
  const user = authResult.user as InternalUserLike

  if (!user || !hasInternalRole(user, ['leadRecruiter', 'recruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.login, request.url), 303)
  }

  try {
    const reqLike = { payload, user } as any

    const employeeProfile = await payload.find({
      collection: 'employee-profiles',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req: reqLike,
      where: {
        user: {
          equals: user.id,
        },
      },
    })

    const employeeID = employeeProfile.docs[0]?.id

    if (!employeeID) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Employee profile not found for current user.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const openSession = await getOpenAttendanceSession({
      employeeID,
      req: reqLike,
    })

    if (!openSession?.id) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'No open attendance session found.')
      return NextResponse.redirect(redirectURL, 303)
    }

    await payload.update({
      collection: 'attendance-logs',
      data: {
        punchOutAt: new Date().toISOString(),
      },
      id: openSession.id,
      overrideAccess: false,
      user,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'Punch-out captured successfully.')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to punch out.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
