import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { INTERVIEW_STATUSES, type InterviewStatus } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

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

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.interviews.list, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const interviewID = parseNumericID(formData.get('interviewId'))
  const statusInput = readString(formData.get('status'))

  if (!interviewID) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('error', 'Valid interview ID is required.')
    return NextResponse.redirect(failureURL, 303)
  }

  if (!INTERVIEW_STATUSES.includes(statusInput as InterviewStatus)) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('error', 'Invalid interview status selected.')
    return NextResponse.redirect(failureURL, 303)
  }

  try {
    await payload.update({
      collection: 'interviews',
      data: {
        status: statusInput as InterviewStatus,
      },
      id: interviewID,
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildRedirectURL(request)
    successURL.searchParams.set('success', 'interviewStatusUpdated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to update interview status.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
