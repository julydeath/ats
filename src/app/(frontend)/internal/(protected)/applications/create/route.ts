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

const buildCreateRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.applications.new, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const candidateID = parseNumericID(formData.get('candidateId'))
  const jobID = parseNumericID(formData.get('jobId'))
  const notes = readString(formData.get('notes')) || undefined
  const latestComment = readString(formData.get('latestComment')) || undefined
  const pipelineSource = readString(formData.get('pipelineSource')) || undefined
  const submissionType = readString(formData.get('submissionType')) || undefined
  const clientBillRate = readString(formData.get('clientBillRate')) || undefined
  const payRate = readString(formData.get('payRate')) || undefined
  const recruiterID = parseNumericID(formData.get('recruiterId'))

  if (!candidateID || !jobID || !recruiterID) {
    const failureURL = buildCreateRedirectURL(request)
    failureURL.searchParams.set('error', 'Candidate, job, and recruiter are required.')
    return NextResponse.redirect(failureURL, 303)
  }

  try {
    const application = await payload.create({
      collection: 'applications',
      data: {
        candidate: candidateID,
        clientBillRate,
        job: jobID,
        latestComment,
        notes,
        payRate,
        pipelineSource,
        recruiter: recruiterID,
        stage: 'sourcedByRecruiter',
        submissionType,
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = new URL(`${APP_ROUTES.internal.applications.detailBase}/${application.id}`, request.url)
    successURL.searchParams.set('success', 'applicationCreated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildCreateRedirectURL(request)
    failureURL.searchParams.set('candidateId', String(candidateID))
    failureURL.searchParams.set('jobId', String(jobID))
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to create application.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
