import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { approvePayrollRun } from '@/lib/hr/payroll'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.hr.payroll, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: request.headers })
  const user = auth.user as InternalUserLike

  if (!user || !hasInternalRole(user, ['admin'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  try {
    const formData = await request.formData()
    const runId = String(formData.get('runId') || '')

    if (!runId || !/^\d+$/.test(runId)) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Payroll run ID is required.')
      return NextResponse.redirect(redirectURL, 303)
    }

    await approvePayrollRun({
      req: { payload, user } as any,
      runID: Number(runId),
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'Payroll run approved successfully.')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to approve payroll run.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
