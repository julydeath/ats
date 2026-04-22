import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { generatePerformanceSnapshotsForCycle } from '@/lib/hr/performance'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.hr.performance, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: await getHeaders() })
  const user = auth.user as InternalUserLike

  if (!user || !hasInternalRole(user, ['admin'])) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', 'You are not allowed to perform this action.')
    return NextResponse.redirect(redirectURL, 303)
  }

  try {
    const formData = await request.formData()
    const cycleId = String(formData.get('cycleId') || '')

    if (!cycleId || !/^\d+$/.test(cycleId)) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Cycle is required for snapshot generation.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const reqLike = { payload, user } as any
    const result = await generatePerformanceSnapshotsForCycle({
      cycleID: Number(cycleId),
      req: reqLike,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', `Generated snapshots for ${result.generated} employees.`)
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to generate snapshots.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
