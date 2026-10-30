import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { getPayloadAuthHeaders } from '@/lib/auth/payload-auth-headers'

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

// Hands a lead-managed application to a recruiter; from then on it follows
// the normal recruiter flow and becomes visible to that recruiter.
export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await getPayloadAuthHeaders(request.headers) })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const applicationID = parseNumericID(formData.get('applicationId'))
  const recruiterID = parseNumericID(formData.get('recruiterId'))

  if (!applicationID) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.applications.list, request.url), 303)
  }

  const detailURL = new URL(`${APP_ROUTES.internal.applications.detailBase}/${applicationID}`, request.url)

  if (!recruiterID) {
    detailURL.searchParams.set('error', 'Select a recruiter to assign.')
    return NextResponse.redirect(detailURL, 303)
  }

  try {
    await payload.update({
      collection: 'applications',
      data: {
        recruiter: recruiterID,
      },
      id: applicationID,
      overrideAccess: false,
      user: internalUser,
    })

    detailURL.searchParams.set('success', 'recruiterAssigned')
    return NextResponse.redirect(detailURL, 303)
  } catch (error) {
    detailURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to assign recruiter.',
    )
    return NextResponse.redirect(detailURL, 303)
  }
}
