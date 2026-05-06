import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { readCurrentInternalUser } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { updatePayrollLineItemPaymentStatus } from '@/lib/hr/payroll'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.hr.payroll, request.url)

const isValidPaymentStatus = (value: string): value is 'pending' | 'paid' | 'notPaid' =>
  value === 'pending' || value === 'paid' || value === 'notPaid'

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const user = await readCurrentInternalUser()

  if (!user || !user.isActive || user.role !== 'admin') {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', 'You are not allowed to perform this action.')
    return NextResponse.redirect(redirectURL, 303)
  }

  try {
    const formData = await request.formData()
    const lineItemId = String(formData.get('lineItemId') || '')
    const paymentStatus = String(formData.get('paymentStatus') || '')
    const paymentReference = String(formData.get('paymentReference') || '')
    const paymentNotes = String(formData.get('paymentNotes') || '')

    if (!lineItemId || !/^\d+$/.test(lineItemId)) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Valid salary entry ID is required.')
      return NextResponse.redirect(redirectURL, 303)
    }

    if (!isValidPaymentStatus(paymentStatus)) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Valid manual payment status is required.')
      return NextResponse.redirect(redirectURL, 303)
    }

    await updatePayrollLineItemPaymentStatus({
      lineItemID: Number(lineItemId),
      paymentNotes,
      paymentReference,
      paymentStatus,
      req: { payload, user } as any,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', `Salary entry marked as ${paymentStatus}.`)
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to update salary payment status.',
    )
    return NextResponse.redirect(redirectURL, 303)
  }
}
