import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { JOB_EMPLOYMENT_TYPES, JOB_PRIORITIES } from '@/lib/constants/recruitment'
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

const parseOptionalNumber = (value: FormDataEntryValue | null): number | undefined => {
  const raw = readString(value)

  if (!raw) {
    return undefined
  }

  const numeric = Number(raw)
  return Number.isFinite(numeric) ? numeric : undefined
}

const parseList = (value: FormDataEntryValue | null): string[] => {
  const raw = readString(value)

  if (!raw) {
    return []
  }

  return raw
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const parseEnumValue = <T extends readonly string[]>(
  value: FormDataEntryValue | null,
  options: T,
): T[number] | null => {
  const raw = readString(value)
  if (!raw) {
    return null
  }

  return options.includes(raw as T[number]) ? (raw as T[number]) : null
}

const buildTemplatesRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.jobs.templates, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()

  const templateName = readString(formData.get('templateName'))
  const title = readString(formData.get('title'))
  const employmentType = parseEnumValue(formData.get('employmentType'), JOB_EMPLOYMENT_TYPES)
  const priority = parseEnumValue(formData.get('priority'), JOB_PRIORITIES)
  const description = readString(formData.get('description'))

  if (!templateName || !title || !employmentType || !priority || !description) {
    const failureURL = buildTemplatesRedirectURL(request)
    failureURL.searchParams.set('create', '1')
    failureURL.searchParams.set(
      'error',
      'Template name, role title, valid employment type, valid priority, and description are required.',
    )
    return NextResponse.redirect(failureURL, 303)
  }

  const isActiveRaw = readString(formData.get('isActive')).toLowerCase()

  try {
    await payload.create({
      collection: 'job-templates',
      data: {
        businessUnit: readString(formData.get('businessUnit')) || undefined,
        department: readString(formData.get('department')) || undefined,
        description,
        employmentType,
        experienceMax: parseOptionalNumber(formData.get('experienceMax')),
        experienceMin: parseOptionalNumber(formData.get('experienceMin')),
        isActive: isActiveRaw !== 'inactive',
        location: readString(formData.get('location')) || undefined,
        openings: parseOptionalNumber(formData.get('openings')),
        ownedByLeadRecruiter: parseNumericID(formData.get('ownedByLeadRecruiter')) ?? undefined,
        priority,
        requiredSkills: parseList(formData.get('requiredSkills')).map((skill) => ({ skill })),
        salaryMax: parseOptionalNumber(formData.get('salaryMax')),
        salaryMin: parseOptionalNumber(formData.get('salaryMin')),
        templateName,
        title,
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildTemplatesRedirectURL(request)
    successURL.searchParams.set('success', 'templateCreated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildTemplatesRedirectURL(request)
    failureURL.searchParams.set('create', '1')
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to save job template.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
