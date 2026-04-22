import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
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

const parseStatus = (value: FormDataEntryValue | null): 'active' | 'inactive' => {
  if (typeof value !== 'string') {
    return 'active'
  }

  const normalized = value.trim()
  return normalized === 'inactive' ? 'inactive' : 'active'
}

const readOptionalText = (value: FormDataEntryValue | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized || undefined
}

const buildRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.assignments.lead, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await getHeaders() })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  try {
    const formData = await request.formData()
    const assignmentID = parseNumericID(formData.get('assignmentId'))
    const jobID = parseNumericID(formData.get('jobId'))
    const recruiterID = parseNumericID(formData.get('recruiterId'))
    const notes = readOptionalText(formData.get('notes'))
    const status = parseStatus(formData.get('status'))
    const currentUserID =
      typeof internalUser?.id === 'number'
        ? internalUser.id
        : typeof internalUser?.id === 'string' && /^\d+$/.test(internalUser.id)
          ? Number(internalUser.id)
          : null

    const leadRecruiterID = hasInternalRole(internalUser, ['leadRecruiter'])
      ? currentUserID
      : parseNumericID(formData.get('leadRecruiterId'))

    if (assignmentID) {
      if (!recruiterID) {
        const failureURL = buildRedirectURL(request)
        failureURL.searchParams.set('error', 'Recruiter is required to update assignment.')
        return NextResponse.redirect(failureURL, 303)
      }

      await payload.update({
        collection: 'recruiter-job-assignments',
        data: {
          notes,
          recruiter: recruiterID,
          status,
        },
        id: assignmentID,
        overrideAccess: false,
        user: internalUser,
      })

      const successURL = buildRedirectURL(request)
      successURL.searchParams.set('success', 'recruiterAssignmentUpdated')
      return NextResponse.redirect(successURL, 303)
    }

    if (!jobID || !recruiterID || !leadRecruiterID) {
      const failureURL = buildRedirectURL(request)
      failureURL.searchParams.set('error', 'Missing required assignment inputs.')
      return NextResponse.redirect(failureURL, 303)
    }

    await payload.create({
      collection: 'recruiter-job-assignments',
      data: {
        job: jobID,
        leadRecruiter: leadRecruiterID,
        notes,
        recruiter: recruiterID,
        status,
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildRedirectURL(request)
    successURL.searchParams.set('success', 'recruiterAssignmentCreated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to assign recruiter.')
    return NextResponse.redirect(failureURL, 303)
  }
}
