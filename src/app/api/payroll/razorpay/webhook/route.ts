import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { mapRazorpayPayoutStatus, verifyRazorpayWebhookSignature } from '@/lib/payments/razorpayx'
import { reconcilePayrollRunFromPayouts } from '@/lib/hr/payroll'
import { readRelationID } from '@/lib/hr/common'
import type { PayrollPayoutTransaction } from '@/payload-types'

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const signature = request.headers.get('x-razorpay-signature') || ''
  const eventID = request.headers.get('x-razorpay-event-id') || undefined
  const rawBody = await request.text()

  if (!signature || !verifyRazorpayWebhookSignature({ body: rawBody, signature })) {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}

  try {
    body = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const payoutEntity =
    body?.payload && typeof body.payload === 'object'
      ? ((body.payload as { payout?: { entity?: Record<string, unknown> } }).payout?.entity || null)
      : null

  if (!payoutEntity) {
    return Response.json({ ok: true })
  }

  const payoutID = typeof payoutEntity.id === 'string' ? payoutEntity.id : null
  const payoutStatusRaw = typeof payoutEntity.status === 'string' ? payoutEntity.status : 'processing'
  const mappedStatus = mapRazorpayPayoutStatus(payoutStatusRaw)
  const utr = typeof payoutEntity.utr === 'string' ? payoutEntity.utr : undefined

  if (!payoutID) {
    return Response.json({ ok: true })
  }

  const txnResult = await payload.find({
    collection: 'payroll-payout-transactions',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      payoutID: {
        equals: payoutID,
      },
    },
  })

  if (!txnResult.docs[0]?.id) {
    return Response.json({ ok: true, message: 'Payout transaction not found for payout ID.' })
  }

  const txn: PayrollPayoutTransaction = txnResult.docs[0]
  const txnID = readRelationID(txn.id)
  const lineItemID = readRelationID(txn.lineItem)
  const runID = readRelationID(txn.payrollRun)

  if (!txnID) {
    return Response.json({ ok: true })
  }

  await payload.update({
    collection: 'payroll-payout-transactions',
    data: {
      payoutStatus: mappedStatus,
      responseLog: body,
      utr,
      webhookEventID: eventID,
    },
    id: txnID,
    overrideAccess: true,
  })

  if (lineItemID) {
    await payload.update({
      collection: 'payroll-line-items',
      data: {
        status: mappedStatus,
      },
      id: lineItemID,
      overrideAccess: true,
    })
  }

  if (runID) {
    await reconcilePayrollRunFromPayouts({
      req: { payload } as any,
      runID: runID,
    })
  }

  return Response.json({ ok: true })
}
