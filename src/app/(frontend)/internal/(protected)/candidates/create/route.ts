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

const parseBoolean = (value: FormDataEntryValue | null): boolean => {
  const raw = readString(value).toLowerCase()
  return raw === 'on' || raw === 'true'
}

const parseList = (value: FormDataEntryValue | string | null): string[] => {
  const raw = typeof value === 'string' ? value.trim() : readString(value)

  if (!raw) {
    return []
  }

  return Array.from(
    new Set(
      raw
        .split(/[,\n]/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
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
  const prefix = readString(formData.get('prefix')) || undefined
  const firstName = readString(formData.get('firstName')) || undefined
  const middleName = readString(formData.get('middleName')) || undefined
  const lastName = readString(formData.get('lastName')) || undefined
  const nickName = readString(formData.get('nickName')) || undefined
  const email = readString(formData.get('email')) || undefined
  const alternateEmail = readString(formData.get('alternateEmail')) || undefined
  const phone = readString(formData.get('phone')) || undefined
  const alternatePhone = readString(formData.get('alternatePhone')) || undefined
  const homePhone = readString(formData.get('homePhone')) || undefined
  const workPhone = readString(formData.get('workPhone')) || undefined
  const otherPhone = readString(formData.get('otherPhone')) || undefined
  const skypeID = readString(formData.get('skypeID')) || undefined
  const facebookProfileURL = readString(formData.get('facebookProfileURL')) || undefined
  const twitterProfileURL = readString(formData.get('twitterProfileURL')) || undefined
  const videoReference = readString(formData.get('videoReference')) || undefined
  const currentLocation = readString(formData.get('currentLocation')) || undefined
  const city = readString(formData.get('city')) || undefined
  const state = readString(formData.get('state')) || undefined
  const country = readString(formData.get('country')) || undefined
  const postalCode = readString(formData.get('postalCode')) || undefined
  const address = readString(formData.get('address')) || undefined
  const currentCompany = readString(formData.get('currentCompany')) || undefined
  const jobTitle = readString(formData.get('jobTitle')) || undefined
  const currentRole = readString(formData.get('currentRole')) || undefined
  const linkedInURL = readString(formData.get('linkedInURL')) || undefined
  const portfolioURL = readString(formData.get('portfolioURL')) || undefined
  const technology = readString(formData.get('technology')) || undefined
  const sourceInput = readString(formData.get('source'))
  const source: CandidateSource = CANDIDATE_SOURCES.includes(sourceInput as CandidateSource)
    ? (sourceInput as CandidateSource)
    : 'linkedin'
  const sourceDetails = readString(formData.get('sourceDetails')) || undefined
  const skillsInput = readString(formData.get('skills'))
  const primarySkillsInput = readString(formData.get('primarySkills'))
  const notes = readString(formData.get('notes')) || undefined
  const sourceJobID = parseNumericID(formData.get('sourceJob'))
  const totalExperienceYears = parseOptionalNumber(formData.get('totalExperienceYears'))
  const totalExperienceMonths = parseOptionalNumber(formData.get('totalExperienceMonths'))
  const expectedSalary = parseOptionalNumber(formData.get('expectedSalary'))
  const expectedPayMin = parseOptionalNumber(formData.get('expectedPayMin'))
  const expectedPayMax = parseOptionalNumber(formData.get('expectedPayMax'))
  const expectedPayCurrency = readString(formData.get('expectedPayCurrency')) || undefined
  const expectedPayType = readString(formData.get('expectedPayType')) || undefined
  const expectedPayUnit = readString(formData.get('expectedPayUnit')) || undefined
  const noticePeriodDays = parseOptionalNumber(formData.get('noticePeriodDays'))
  const noticePeriodLabel = readString(formData.get('noticePeriodLabel')) || undefined
  const relocation = parseBoolean(formData.get('relocation'))
  const taxTerms = readString(formData.get('taxTerms')) || undefined
  const workAuthorization = readString(formData.get('workAuthorization')) || undefined
  const workAuthorizationExpiry = readString(formData.get('workAuthorizationExpiry')) || undefined
  const clearance = parseBoolean(formData.get('clearance'))
  const applicantStatus = readString(formData.get('applicantStatus')) || undefined
  const applicantGroup = readString(formData.get('applicantGroup')) || undefined
  const ownership = parseNumericID(formData.get('ownershipId'))
  const referredBy = readString(formData.get('referredBy')) || undefined
  const nationality = readString(formData.get('nationality')) || undefined
  const referenceID = readString(formData.get('referenceID')) || undefined
  const aadhaarNumber = readString(formData.get('aadhaarNumber')) || undefined
  const gpa = readString(formData.get('gpa')) || undefined
  const gender = readString(formData.get('gender')) || undefined
  const raceEthnicity = readString(formData.get('raceEthnicity')) || undefined
  const veteranStatus = readString(formData.get('veteranStatus')) || undefined
  const disabilityStatus = readString(formData.get('disabilityStatus')) || undefined
  const additionalComments = readString(formData.get('additionalComments')) || undefined
  const currentUserID = toNumericID(internalUser?.id)
  const skills = parseList(skillsInput).slice(0, 30)
  const primarySkills = parseList(primarySkillsInput).slice(0, 20)

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

  if (
    expectedPayMin !== undefined &&
    expectedPayMax !== undefined &&
    expectedPayMin > expectedPayMax
  ) {
    const failureURL = buildCreateRedirectURL(request)
    failureURL.searchParams.set('error', 'Expected pay min cannot be greater than expected pay max.')
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
        aadhaarNumber,
        additionalComments,
        alternateEmail,
        alternatePhone,
        applicantGroup,
        applicantStatus,
        address,
        city,
        clearance,
        country,
        currentCompany,
        currentLocation,
        currentRole,
        disabilityStatus,
        email,
        expectedPayMax,
        expectedPayMin,
        expectedPayCurrency,
        expectedPayType,
        expectedPayUnit,
        expectedSalary,
        facebookProfileURL,
        firstName,
        fullName,
        gender,
        gpa,
        homePhone,
        jobTitle,
        linkedInURL,
        middleName,
        nationality,
        nickName,
        noticePeriodDays,
        noticePeriodLabel,
        notes,
        otherPhone,
        ownership: ownership ?? undefined,
        phone,
        portfolioURL,
        postalCode,
        prefix,
        primarySkills: primarySkills.length > 0 ? primarySkills : undefined,
        referenceID,
        referredBy,
        relocation,
        resume: uploadedResumeID ?? undefined,
        raceEthnicity,
        skypeID,
        state,
        source,
        sourceDetails,
        sourceJob: sourceJobID,
        sourcedBy: currentUserID ?? undefined,
        skills: skills.length > 0 ? skills : undefined,
        taxTerms,
        technology,
        totalExperienceMonths,
        totalExperienceYears,
        twitterProfileURL,
        videoReference,
        veteranStatus,
        workAuthorization,
        workAuthorizationExpiry,
        workPhone,
        lastName,
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
