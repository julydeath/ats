import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

type ReviewAction = 'approve' | 'reject' | 'sendBack'

const STAGE_BY_ACTION: Record<ReviewAction, 'internalReviewApproved' | 'internalReviewRejected' | 'sentBackForCorrection'> =
  {
    approve: 'internalReviewApproved',
    reject: 'internalReviewRejected',
    sendBack: 'sentBackForCorrection',
  }

const readString = (value: FormDataEntryValue | null): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const parseNumericID = (value: FormDataEntryValue | null): number | null => {
  const raw = readString(value)

  if (!raw || !/^\d+$/.test(raw)) {
    return null
  }

  return Number(raw)
}

const isReviewAction = (value: string): value is ReviewAction =>
  value === 'approve' || value === 'reject' || value === 'sendBack'

const buildQueueRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.applications.reviewQueue, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url))
  }

  const formData = await request.formData()
  const applicationID = parseNumericID(formData.get('applicationId'))
  const action = readString(formData.get('action'))
  const latestComment = readString(formData.get('latestComment')) || undefined

  if (!applicationID || !isReviewAction(action)) {
    const failureURL = buildQueueRedirectURL(request)
    failureURL.searchParams.set('error', 'Valid review action and application ID are required.')
    return NextResponse.redirect(failureURL)
  }

  try {
    await payload.update({
      collection: 'applications',
      id: applicationID,
      data: {
        latestComment,
        stage: STAGE_BY_ACTION[action],
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildQueueRedirectURL(request)
    successURL.searchParams.set('success', action)
    return NextResponse.redirect(successURL)
  } catch (error) {
    const failureURL = buildQueueRedirectURL(request)
    failureURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to review application.')
    return NextResponse.redirect(failureURL)
  }
}
