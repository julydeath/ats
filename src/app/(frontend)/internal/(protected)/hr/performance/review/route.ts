import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.hr.performance, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: await getHeaders() })
  const user = auth.user as InternalUserLike

  if (!user || !hasInternalRole(user, ['admin', 'leadRecruiter'])) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', 'You are not allowed to perform this action.')
    return NextResponse.redirect(redirectURL, 303)
  }

  try {
    const formData = await request.formData()
    const cycleId = String(formData.get('cycleId') || '')
    const employeeId = String(formData.get('employeeId') || '')
    const managerRating = Number(formData.get('managerRating') || 0)
    const managerComments = String(formData.get('managerComments') || '').trim()

    if (
      !cycleId ||
      !employeeId ||
      !/^\d+$/.test(cycleId) ||
      !/^\d+$/.test(employeeId) ||
      !Number.isFinite(managerRating) ||
      managerRating < 1 ||
      managerRating > 5
    ) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Cycle, employee, and manager rating (1-5) are required.')
      return NextResponse.redirect(redirectURL, 303)
    }

    await payload.create({
      collection: 'performance-reviews',
      data: {
        cycle: Number(cycleId),
        employee: Number(employeeId),
        managerComments: managerComments || undefined,
        managerRating,
        reviewer: Number(user.id),
        status: 'submitted',
      },
      overrideAccess: false,
      user,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'Performance review submitted.')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to save performance review.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
