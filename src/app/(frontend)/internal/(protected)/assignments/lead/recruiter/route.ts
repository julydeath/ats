import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

const parseNumericID = (value: FormDataEntryValue | null): number | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  if (!/^\d+$/.test(normalized)) {
    return null
  }

  return Number(normalized)
}

const buildRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.assignments.lead, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url))
  }

  try {
    const formData = await request.formData()
    const jobID = parseNumericID(formData.get('jobId'))
    const recruiterID = parseNumericID(formData.get('recruiterId'))
    const notesRaw = formData.get('notes')
    const currentUserID =
      typeof internalUser?.id === 'number'
        ? internalUser.id
        : typeof internalUser?.id === 'string' && /^\d+$/.test(internalUser.id)
          ? Number(internalUser.id)
          : null

    const leadRecruiterID = hasInternalRole(internalUser, ['leadRecruiter'])
      ? currentUserID
      : parseNumericID(formData.get('leadRecruiterId'))

    if (!jobID || !recruiterID || !leadRecruiterID) {
      const failureURL = buildRedirectURL(request)
      failureURL.searchParams.set('error', 'Missing required assignment inputs.')
      return NextResponse.redirect(failureURL)
    }

    await payload.create({
      collection: 'recruiter-job-assignments',
      data: {
        job: jobID,
        leadRecruiter: leadRecruiterID,
        notes: typeof notesRaw === 'string' && notesRaw.trim() ? notesRaw.trim() : undefined,
        recruiter: recruiterID,
        status: 'active',
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildRedirectURL(request)
    successURL.searchParams.set('success', 'recruiterAssignmentCreated')
    return NextResponse.redirect(successURL)
  } catch (error) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to assign recruiter.')
    return NextResponse.redirect(failureURL)
  }
}
