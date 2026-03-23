import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

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

const buildRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.assignments.head, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'headRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url))
  }

  try {
    const formData = await request.formData()
    const assignmentID = parseNumericID(formData.get('assignmentId'))
    const jobID = parseNumericID(formData.get('jobId'))
    const leadRecruiterID = parseNumericID(formData.get('leadRecruiterId'))
    const notes = readOptionalText(formData.get('notes'))
    const status = parseStatus(formData.get('status'))

    if (assignmentID) {
      if (!leadRecruiterID) {
        const failureURL = buildRedirectURL(request)
        failureURL.searchParams.set('error', 'Lead recruiter is required to update assignment.')
        return NextResponse.redirect(failureURL)
      }

      await payload.update({
        collection: 'job-lead-assignments',
        data: {
          leadRecruiter: leadRecruiterID,
          notes,
          status,
        },
        id: assignmentID,
        overrideAccess: false,
        user: internalUser,
      })

      const successURL = buildRedirectURL(request)
      successURL.searchParams.set('success', 'jobAssignmentUpdated')
      return NextResponse.redirect(successURL)
    }

    if (!jobID || !leadRecruiterID) {
      const failureURL = buildRedirectURL(request)
      failureURL.searchParams.set('error', 'Missing required assignment inputs.')
      return NextResponse.redirect(failureURL)
    }

    const job = await payload.findByID({
      collection: 'jobs',
      depth: 0,
      id: jobID,
      overrideAccess: false,
      user: internalUser,
    })

    const clientID = extractRelationshipID(job.client)
    const headRecruiterID = extractRelationshipID(job.owningHeadRecruiter)
    const normalizedClientID =
      typeof clientID === 'number' ? clientID : typeof clientID === 'string' && /^\d+$/.test(clientID) ? Number(clientID) : null
    const normalizedHeadRecruiterID =
      typeof headRecruiterID === 'number'
        ? headRecruiterID
        : typeof headRecruiterID === 'string' && /^\d+$/.test(headRecruiterID)
          ? Number(headRecruiterID)
          : null

    if (!normalizedClientID || !normalizedHeadRecruiterID) {
      const failureURL = buildRedirectURL(request)
      failureURL.searchParams.set('error', 'Selected job is missing required client or owner metadata.')
      return NextResponse.redirect(failureURL)
    }

    await payload.create({
      collection: 'job-lead-assignments',
      data: {
        client: normalizedClientID,
        headRecruiter: normalizedHeadRecruiterID,
        job: jobID,
        leadRecruiter: leadRecruiterID,
        notes,
        status,
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildRedirectURL(request)
    successURL.searchParams.set('success', 'jobAssignmentCreated')
    return NextResponse.redirect(successURL)
  } catch (error) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to assign job.')
    return NextResponse.redirect(failureURL)
  }
}
