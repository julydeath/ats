import crypto from 'crypto'

import { env } from '@/lib/env'

type RazorpayPayoutInput = {
  amountInPaise: number
  fundAccountID: string
  idempotencyKey: string
  narration: string
  referenceID: string
}

type RazorpayPayoutResponse = {
  id: string
  status: string
  utr?: string
}

const buildAuthHeader = (): string => {
  const token = Buffer.from(`${env.RAZORPAYX_KEY_ID}:${env.RAZORPAYX_KEY_SECRET}`).toString('base64')
  return `Basic ${token}`
}

export const isRazorpayXConfigured = (): boolean =>
  Boolean(env.RAZORPAYX_ACCOUNT_NUMBER && env.RAZORPAYX_KEY_ID && env.RAZORPAYX_KEY_SECRET)

export const createRazorpayXPayout = async (
  payload: RazorpayPayoutInput,
): Promise<RazorpayPayoutResponse> => {
  if (!isRazorpayXConfigured()) {
    throw new Error('RazorpayX credentials are not configured.')
  }

  const response = await fetch('https://api.razorpay.com/v1/payouts', {
    method: 'POST',
    headers: {
      Authorization: buildAuthHeader(),
      'Content-Type': 'application/json',
      'X-Payout-Idempotency': payload.idempotencyKey,
    },
    body: JSON.stringify({
      account_number: env.RAZORPAYX_ACCOUNT_NUMBER,
      amount: payload.amountInPaise,
      currency: 'INR',
      fund_account_id: payload.fundAccountID,
      mode: 'NEFT',
      narration: payload.narration,
      purpose: 'salary',
      queue_if_low_balance: true,
      reference_id: payload.referenceID,
    }),
  })

  const body = await response.json()

  if (!response.ok) {
    const message =
      typeof body?.error?.description === 'string'
        ? body.error.description
        : 'Unable to create RazorpayX payout.'
    throw new Error(message)
  }

  return {
    id: String(body.id || ''),
    status: String(body.status || 'processing'),
    utr: typeof body.utr === 'string' ? body.utr : undefined,
  }
}

export const mapRazorpayPayoutStatus = (status: string):
  | 'created'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'reversed'
  | 'cancelled' => {
  const normalized = status.toLowerCase()

  if (normalized === 'processed') return 'processed'
  if (normalized === 'failed' || normalized === 'rejected') return 'failed'
  if (normalized === 'reversed') return 'reversed'
  if (normalized === 'cancelled') return 'cancelled'
  if (normalized === 'queued' || normalized === 'pending' || normalized === 'processing') return 'processing'

  return 'created'
}

export const verifyRazorpayWebhookSignature = ({
  body,
  signature,
}: {
  body: string
  signature: string
}): boolean => {
  if (!env.RAZORPAYX_WEBHOOK_SECRET) {
    return false
  }

  const digest = crypto
    .createHmac('sha256', env.RAZORPAYX_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}
