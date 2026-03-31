import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  JOB_EMPLOYMENT_TYPES,
  JOB_PRIORITIES,
  JOB_STATUSES,
  type JobEmploymentType,
  type JobPriority,
  type JobStatus,
} from '@/lib/constants/recruitment'
import { APP_ROUTES } from '@/lib/constants/routes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const readString = (value: FormDataEntryValue | null): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const parseNumericID = (value: FormDataEntryValue | null): number | null => {
  const normalized = readString(value)

  if (!normalized || !/^\d+$/.test(normalized)) {
    return null
  }

  return Number(normalized)
}

const parseOptionalNumber = (value: FormDataEntryValue | null): number | undefined => {
  const normalized = readString(value)

  if (!normalized) {
    return undefined
  }

  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : undefined
}

const parseTextArray = (value: FormDataEntryValue | null): string[] => {
  const normalized = readString(value)

  if (!normalized) {
    return []
  }

  return Array.from(
    new Set(
      normalized
        .split(/[\n,]/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

const parseMultiNumericIDs = (values: FormDataEntryValue[]): number[] =>
  Array.from(
    new Set(
      values
        .map((value) => parseNumericID(value))
        .filter((value): value is number => value !== null),
    ),
  )

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

const parseJobEmploymentType = (value: FormDataEntryValue | null): JobEmploymentType | null => {
  const normalized = readString(value)

  if (JOB_EMPLOYMENT_TYPES.includes(normalized as JobEmploymentType)) {
    return normalized as JobEmploymentType
  }

  return null
}

const parseJobPriority = (value: FormDataEntryValue | null): JobPriority => {
  const normalized = readString(value)

  if (JOB_PRIORITIES.includes(normalized as JobPriority)) {
    return normalized as JobPriority
  }

  return 'medium'
}

const parseJobStatus = (value: FormDataEntryValue | null): JobStatus => {
  const normalized = readString(value)

  if (JOB_STATUSES.includes(normalized as JobStatus)) {
    return normalized as JobStatus
  }

  return 'active'
}

const parseSkills = (value: FormDataEntryValue | null): Array<{ skill: string }> => {
  const normalized = readString(value)

  if (!normalized) {
    return []
  }

  return normalized
    .split(/[\n,]/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((skill) => ({ skill }))
}

const buildRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.jobs.assigned, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike
  const currentUserID = toNumericID(internalUser?.id)

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter']) || !currentUserID) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()
  const clientID = parseNumericID(formData.get('clientId'))
  const title = readString(formData.get('title'))
  const requisitionTitle = readString(formData.get('requisitionTitle')) || undefined
  const businessUnit = readString(formData.get('businessUnit')) || undefined
  const clientJobID = readString(formData.get('clientJobID')) || undefined
  const department = readString(formData.get('department')) || undefined
  const employmentType = parseJobEmploymentType(formData.get('employmentType'))
  const location = readString(formData.get('location')) || undefined
  const states = parseTextArray(formData.get('states'))
  const clientBillRate = readString(formData.get('clientBillRate')) || undefined
  const payRate = readString(formData.get('payRate')) || undefined
  const payType = readString(formData.get('payType')) || undefined
  const salaryRangeLabel = readString(formData.get('salaryRangeLabel')) || undefined
  const openings = parseOptionalNumber(formData.get('openings')) || 1
  const description = readString(formData.get('description'))
  const requiredSkills = parseSkills(formData.get('requiredSkills'))
  const priority = parseJobPriority(formData.get('priority'))
  const status = parseJobStatus(formData.get('status'))
  const experienceMin = parseOptionalNumber(formData.get('experienceMin'))
  const experienceMax = parseOptionalNumber(formData.get('experienceMax'))
  const salaryMin = parseOptionalNumber(formData.get('salaryMin'))
  const salaryMax = parseOptionalNumber(formData.get('salaryMax'))
  const targetClosureDate = readString(formData.get('targetClosureDate')) || undefined
  const requirementAssignedOn = readString(formData.get('requirementAssignedOn')) || undefined
  const recruitmentManagerID = parseNumericID(formData.get('recruitmentManagerId'))
  const primaryRecruiterID = parseNumericID(formData.get('primaryRecruiterId'))
  const assignedToIDs = parseMultiNumericIDs(formData.getAll('assignedTo'))
  let leadRecruiterID = hasInternalRole(internalUser, ['leadRecruiter'])
    ? currentUserID
    : parseNumericID(formData.get('leadRecruiterId'))

  if (!clientID || !title || !employmentType || !description) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('error', 'Client, title, employment type, and description are required.')
    return NextResponse.redirect(failureURL, 303)
  }

  if (!leadRecruiterID && hasInternalRole(internalUser, ['admin'])) {
    try {
      const client = await payload.findByID({
        collection: 'clients',
        depth: 0,
        id: clientID,
        overrideAccess: false,
        user: internalUser,
      })

      const clientLeadID = toNumericID(extractRelationshipID(client.owningHeadRecruiter))
      if (clientLeadID) {
        leadRecruiterID = clientLeadID
      }
    } catch {
      // noop: client-level fallback is best effort
    }
  }

  if (!leadRecruiterID) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('error', 'Lead Recruiter assignment is required to create job.')
    return NextResponse.redirect(failureURL, 303)
  }

  try {
    const job = await payload.create({
      collection: 'jobs',
      data: {
        businessUnit,
        clientBillRate,
        clientJobID,
        client: clientID,
        department,
        description,
        employmentType,
        experienceMax,
        experienceMin,
        location,
        openings,
        owningHeadRecruiter: leadRecruiterID,
        payRate,
        payType,
        primaryRecruiter: primaryRecruiterID ?? undefined,
        priority,
        recruitmentManager: recruitmentManagerID ?? undefined,
        requisitionTitle,
        requirementAssignedOn,
        requiredSkills,
        salaryRangeLabel,
        salaryMax,
        salaryMin,
        states: states.length > 0 ? states : undefined,
        status,
        targetClosureDate,
        title,
        assignedTo: assignedToIDs.length > 0 ? assignedToIDs : undefined,
      },
      overrideAccess: false,
      user: internalUser,
    })

    let autoAssignmentCreated = true

    if (hasInternalRole(internalUser, ['admin'])) {
      try {
        await payload.create({
          collection: 'job-lead-assignments',
          data: {
            assignedBy: currentUserID,
            client: clientID,
            headRecruiter: currentUserID,
            job: job.id,
            leadRecruiter: leadRecruiterID,
            notes: 'Auto-created during job creation.',
            status: 'active',
          },
          overrideAccess: false,
          user: internalUser,
        })
      } catch {
        autoAssignmentCreated = false
      }
    }

    const successURL = buildRedirectURL(request)
    successURL.searchParams.set('success', 'jobCreated')

    if (!autoAssignmentCreated) {
      successURL.searchParams.set('warning', 'leadAssignmentPending')
    }

    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to create job. Please retry.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
