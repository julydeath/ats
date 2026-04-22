import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { APIError, getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { executeLeaveAction } from '@/lib/hr/leave-actions'

const buildRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.hr.leave, request.url)

const toID = (value: FormDataEntryValue | null): number | string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return null
}

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
    const leaveRequestId = toID(formData.get('leaveRequestId'))
    const comment = String(formData.get('comment') || formData.get('rejectionReason') || '')
      .trim()
      || null
    const overrideReason = String(formData.get('overrideReason') || '').trim() || null

    if (!leaveRequestId) {
      throw new APIError('Leave request ID is required.', 400)
    }

    await executeLeaveAction({
      input: {
        action: 'reject',
        comment,
        leaveRequestId,
        overrideReason,
      },
      payload,
      user,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'Leave request rejected successfully.')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to reject leave request.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
