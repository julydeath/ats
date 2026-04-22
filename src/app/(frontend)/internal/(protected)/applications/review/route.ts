import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

type ReviewAction = 'approve' | 'reject' | 'sendBack'

const STAGE_BY_ACTION: Record<
  ReviewAction,
  'screened' | 'rejected' | 'sourced'
> = {
  approve: 'screened',
  reject: 'rejected',
  sendBack: 'sourced',
}

const readString = (value: FormDataEntryValue | null): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const parseDocumentID = (value: FormDataEntryValue | null): number | string | null => {
  const raw = readString(value)

  if (!raw) {
    return null
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw)
  }

  return raw
}

const normalizeReviewAction = (value: string): ReviewAction | null => {
  const normalized = value.replace(/[\s_-]/g, '').toLowerCase()

  if (normalized === 'approve') {
    return 'approve'
  }

  if (normalized === 'reject') {
    return 'reject'
  }

  if (normalized === 'sendback') {
    return 'sendBack'
  }

  return null
}

const buildQueueRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.applications.reviewQueue, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const applicationID =
    parseDocumentID(formData.get('applicationId')) ??
    parseDocumentID(formData.get('applicationID')) ??
    parseDocumentID(formData.get('id'))
  const action = normalizeReviewAction(
    readString(formData.get('action')) || readString(formData.get('reviewAction')) || readString(formData.get('intent')),
  )
  const latestComment = readString(formData.get('latestComment')) || undefined

  if (!applicationID || !action) {
    const failureURL = buildQueueRedirectURL(request)
    failureURL.searchParams.set('error', 'Valid review action and application ID are required.')
    return NextResponse.redirect(failureURL, 303)
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
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildQueueRedirectURL(request)
    failureURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to review application.')
    return NextResponse.redirect(failureURL, 303)
  }
}
