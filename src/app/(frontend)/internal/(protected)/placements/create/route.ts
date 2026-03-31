import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { PLACEMENT_STATUSES, PLACEMENT_TYPES } from '@/lib/constants/recruitment'
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

const toISODate = (value: FormDataEntryValue | null): string | undefined => {
  const raw = readString(value)

  if (!raw) {
    return undefined
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
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

const buildRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.placements.list, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  const internalUser = user as InternalUserLike

  if (!hasInternalRole(internalUser, ['admin', 'leadRecruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  const formData = await request.formData()

  const application = parseNumericID(formData.get('application'))
  const placementType = parseEnumValue(formData.get('placementType'), PLACEMENT_TYPES)
  const status = parseEnumValue(formData.get('status'), PLACEMENT_STATUSES)

  if (!application || !placementType || !status) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('create', '1')
    failureURL.searchParams.set('error', 'Application, valid placement type, and valid status are required.')
    return NextResponse.redirect(failureURL, 303)
  }

  try {
    await payload.create({
      collection: 'placements',
      data: {
        application,
        businessUnit: readString(formData.get('businessUnit')) || undefined,
        clientBillRate: readString(formData.get('clientBillRate')) || undefined,
        clientPrimeVendor: readString(formData.get('clientPrimeVendor')) || undefined,
        margin: readString(formData.get('margin')) || undefined,
        notes: readString(formData.get('notes')) || undefined,
        overhead: readString(formData.get('overhead')) || undefined,
        payRate: readString(formData.get('payRate')) || undefined,
        perDiemPerHour: readString(formData.get('perDiemPerHour')) || undefined,
        placementType,
        status,
        tentativeStartDate: toISODate(formData.get('tentativeStartDate')),
        actualStartDate: toISODate(formData.get('actualStartDate')),
        actualEndDate: toISODate(formData.get('actualEndDate')),
      },
      overrideAccess: false,
      user: internalUser,
    })

    const successURL = buildRedirectURL(request)
    successURL.searchParams.set('success', 'placementCreated')
    return NextResponse.redirect(successURL, 303)
  } catch (error) {
    const failureURL = buildRedirectURL(request)
    failureURL.searchParams.set('create', '1')
    failureURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to create placement.',
    )
    return NextResponse.redirect(failureURL, 303)
  }
}
