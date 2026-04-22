import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { LEAVE_WORKFLOW_ACTION_LABELS } from '@/lib/hr/leave-workflow'
import { executeLeaveAction, parseLeaveActionInput } from '@/lib/hr/leave-actions'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.hr.leave, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: await getHeaders() })
  const user = auth.user as InternalUserLike

  if (!user || !hasInternalRole(user, ['admin', 'leadRecruiter', 'recruiter'])) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', 'You are not allowed to perform this action.')
    return NextResponse.redirect(redirectURL, 303)
  }

  try {
    const formData = await request.formData()
    const input = parseLeaveActionInput(formData)

    const result = await executeLeaveAction({
      input,
      payload,
      user,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set(
      'success',
      `${LEAVE_WORKFLOW_ACTION_LABELS[result.action]} completed. Status updated to ${result.nextStatus}.`,
    )

    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to process leave action.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
