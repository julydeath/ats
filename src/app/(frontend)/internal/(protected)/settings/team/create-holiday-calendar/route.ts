import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { HOLIDAY_TYPE_OPTIONS } from '@/lib/constants/hr'
import { APP_ROUTES } from '@/lib/constants/routes'

const HOLIDAY_TYPE_VALUES = new Set(HOLIDAY_TYPE_OPTIONS.map((option) => option.value))

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.team.base, request.url)

const readString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.trim() : ''

const readNumber = (value: FormDataEntryValue | null): number | null => {
  const raw = readString(value)
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: await getHeaders() })
  const actor = auth.user as InternalUserLike

  if (!actor || !hasInternalRole(actor, ['admin'])) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', 'You are not allowed to perform this action.')
    return NextResponse.redirect(redirectURL, 303)
  }

  try {
    const formData = await request.formData()

    const name = readString(formData.get('name'))
    const state = readString(formData.get('state'))
    const year = readNumber(formData.get('year'))

    const holidayName = readString(formData.get('holidayName'))
    const holidayDate = readString(formData.get('holidayDate'))
    const holidayTypeInput = readString(formData.get('holidayType'))
    const holidayType = HOLIDAY_TYPE_VALUES.has(holidayTypeInput as (typeof HOLIDAY_TYPE_OPTIONS)[number]['value'])
      ? (holidayTypeInput as (typeof HOLIDAY_TYPE_OPTIONS)[number]['value'])
      : 'national'

    if (!name || !state || year === null) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Calendar name, state, and year are required.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const hasAnyHolidayInput = Boolean(holidayName || holidayDate)
    if (hasAnyHolidayInput && (!holidayName || !holidayDate)) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Holiday name and date are both required when adding initial holiday.')
      return NextResponse.redirect(redirectURL, 303)
    }

    await payload.create({
      collection: 'holiday-calendars',
      data: {
        holidays: hasAnyHolidayInput
          ? [
              {
                date: new Date(holidayDate).toISOString(),
                name: holidayName,
                type: holidayType,
              },
            ]
          : [],
        name,
        state,
        year,
      },
      overrideAccess: false,
      user: actor,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'holidayCalendarCreated')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to create holiday calendar.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
