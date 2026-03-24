import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { CANDIDATE_SOURCES, type CandidateSource } from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'

const RESUME_MIME_TYPES = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

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

const parseOptionalNumber = (value: FormDataEntryValue | null): number | undefined => {
  const raw = readString(value)

  if (!raw) {
    return undefined
  }

  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : undefined
}

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

const buildCreateRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.candidates.new, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter', 'recruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()

  const fullName = readString(formData.get('fullName'))
  const email = readString(formData.get('email')) || undefined
  const phone = readString(formData.get('phone')) || undefined
  const alternatePhone = readString(formData.get('alternatePhone')) || undefined
  const currentLocation = readString(formData.get('currentLocation')) || undefined
  const currentCompany = readString(formData.get('currentCompany')) || undefined
  const currentRole = readString(formData.get('currentRole')) || undefined
  const linkedInURL = readString(formData.get('linkedInURL')) || undefined
  const portfolioURL = readString(formData.get('portfolioURL')) || undefined
  const sourceInput = readString(formData.get('source'))
  const source: CandidateSource = CANDIDATE_SOURCES.includes(sourceInput as CandidateSource)
    ? (sourceInput as CandidateSource)
    : 'linkedin'
  const sourceDetails = readString(formData.get('sourceDetails')) || undefined
  const skillsInput = readString(formData.get('skills'))
  const notes = readString(formData.get('notes')) || undefined
  const sourceJobID = parseNumericID(formData.get('sourceJob'))
  const totalExperienceYears = parseOptionalNumber(formData.get('totalExperienceYears'))
  const expectedSalary = parseOptionalNumber(formData.get('expectedSalary'))
  const noticePeriodDays = parseOptionalNumber(formData.get('noticePeriodDays'))
  const currentUserID = toNumericID(internalUser?.id)
  const skills = Array.from(
    new Set(
      skillsInput
        .split(',')
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0),
    ),
  ).slice(0, 20)

  if (!fullName || !sourceJobID) {
    const failureURL = buildCreateRedirectURL(request)
    failureURL.searchParams.set('error', 'Candidate name and source job are required.')
    return NextResponse.redirect(failureURL, 303)
  }

  if (!email && !phone) {
    const failureURL = buildCreateRedirectURL(request)
    failureURL.searchParams.set('error', 'Provide at least one contact method: email or phone.')
    return NextResponse.redirect(failureURL, 303)
  }

  const resumeInput = formData.get('resume')
  let uploadedResumeID: number | null = null

  try {
    if (resumeInput instanceof File && resumeInput.size > 0) {
      if (!RESUME_MIME_TYPES.has(resumeInput.type)) {
        const failureURL = buildCreateRedirectURL(request)
        failureURL.searchParams.set('error', 'Resume must be a PDF, DOC, or DOCX file.')
        return NextResponse.redirect(failureURL, 303)
      }

      const buffer = Buffer.from(await resumeInput.arrayBuffer())

      const resumeDoc = await payload.create({
        collection: 'candidate-resumes',
        data: {
          alt: `${fullName} Resume`,
          sourceJob: sourceJobID,
          uploadedBy: currentUserID ?? undefined,
        },
        file: {
          data: buffer,
          mimetype: resumeInput.type,
          name: resumeInput.name,
          size: resumeInput.size,
        },
        overrideAccess: false,
        user: internalUser,
      })

      uploadedResumeID = resumeDoc.id
    }

    const candidate = await payload.create({
      collection: 'candidates',
      data: {
        alternatePhone,
        currentCompany,
        currentLocation,
        currentRole,
        email,
        expectedSalary,
        fullName,
        linkedInURL,
        noticePeriodDays,
        notes,
        phone,
        portfolioURL,
        resume: uploadedResumeID ?? undefined,
        source,
        sourceDetails,
        sourceJob: sourceJobID,
        sourcedBy: currentUserID ?? undefined,
        skills: skills.length > 0 ? skills : undefined,
        totalExperienceYears,
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = new URL(`${APP_ROUTES.internal.candidates.detailBase}/${candidate.id}`, request.url)
    successURL.searchParams.set('success', 'candidateCreated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    if (uploadedResumeID !== null) {
      try {
        await payload.delete({
          collection: 'candidate-resumes',
          id: uploadedResumeID,
          overrideAccess: false,
          user: internalUser,
        })
      } catch {
        // noop: best-effort cleanup only
      }
    }

    const failureURL = buildCreateRedirectURL(request)
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to save candidate. Please retry.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
