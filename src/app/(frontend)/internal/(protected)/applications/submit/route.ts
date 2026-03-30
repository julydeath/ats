import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
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

const buildListRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.applications.list, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const applicationID = parseNumericID(formData.get('applicationId'))
  const latestComment = readString(formData.get('latestComment')) || undefined

  if (!applicationID) {
    const failureURL = buildListRedirectURL(request)
    failureURL.searchParams.set('error', 'Application ID is required.')
    return NextResponse.redirect(failureURL, 303)
  }

  try {
    await payload.update({
      collection: 'applications',
      id: applicationID,
      data: {
        latestComment,
        stage: 'internalReviewPending',
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildListRedirectURL(request)
    successURL.searchParams.set('success', 'submittedForReview')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildListRedirectURL(request)
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to submit application for review.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
