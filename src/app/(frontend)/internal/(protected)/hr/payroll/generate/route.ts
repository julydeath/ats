import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { generatePayrollRun } from '@/lib/hr/payroll'

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
    const actionType = String(formData.get('actionType') || 'generateRun')

    if (actionType === 'createCycle') {
      const month = Number(formData.get('month') || 0)
      const year = Number(formData.get('year') || 0)
      const startDate = String(formData.get('startDate') || '')
      const endDate = String(formData.get('endDate') || '')
      const payoutDate = String(formData.get('payoutDate') || '')

      if (!month || !year || !startDate || !endDate) {
        const redirectURL = buildRedirectURL(request)
        redirectURL.searchParams.set('error', 'Month, year, and cycle date range are required.')
        return NextResponse.redirect(redirectURL, 303)
      }

      await payload.create({
        collection: 'payroll-cycles',
        data: {
          endDate,
          month,
          payoutDate: payoutDate || undefined,
          startDate,
          status: 'open',
          title: `Payroll ${month}/${year}`,
          year,
        },
        draft: false,
        overrideAccess: false,
        user,
      })

      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('success', 'Payroll cycle created.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const cycleId = String(formData.get('cycleId') || '')
    const ruleSetId = String(formData.get('ruleSetId') || '')

    if (!cycleId || !/^\d+$/.test(cycleId)) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Payroll cycle is required to generate run.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const run = await generatePayrollRun({
      cycleID: Number(cycleId),
      req: { payload, user } as any,
      ruleSetID: /^\d+$/.test(ruleSetId) ? Number(ruleSetId) : undefined,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', `Payroll run ${String(run.payrollRunCode || run.id)} generated.`)
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to process payroll generation.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
