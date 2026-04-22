import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { APIError, getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { HOLIDAY_TYPE_OPTIONS } from '@/lib/constants/hr'
import { APP_ROUTES } from '@/lib/constants/routes'

const HOLIDAY_TYPE_VALUES = new Set(HOLIDAY_TYPE_OPTIONS.map((option) => option.value))
type HolidayTypeValue = (typeof HOLIDAY_TYPE_OPTIONS)[number]['value']

const buildRedirectURL = (request: Request): URL => new URL(APP_ROUTES.internal.team.base, request.url)

const readString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.trim() : ''

const readNumber = (value: FormDataEntryValue | null): number | null => {
  const raw = readString(value)
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: request.headers })
  const actor = auth.user as InternalUserLike

  if (!actor || !hasInternalRole(actor, ['admin'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  try {
    const formData = await request.formData()
    const calendarId = readNumber(formData.get('calendarId'))
    const holidayName = readString(formData.get('holidayName'))
    const holidayDate = readString(formData.get('holidayDate'))
    const holidayTypeRaw = readString(formData.get('holidayType'))
    const holidayType: HolidayTypeValue = HOLIDAY_TYPE_VALUES.has(holidayTypeRaw as HolidayTypeValue)
      ? (holidayTypeRaw as HolidayTypeValue)
      : 'national'

    if (!calendarId || !holidayName || !holidayDate) {
      throw new APIError('Calendar, holiday name, and holiday date are required.', 400)
    }

    const calendar = await payload.findByID({
      collection: 'holiday-calendars',
      depth: 0,
      id: calendarId,
      overrideAccess: false,
      user: actor,
    })

    const existing = Array.isArray(calendar.holidays) ? [...calendar.holidays] : []
    const holidayDateKey = new Date(holidayDate).toISOString().slice(0, 10)

    const duplicate = existing.find((item) => {
      if (!item?.date) return false
      return new Date(item.date).toISOString().slice(0, 10) === holidayDateKey
    })

    if (duplicate) {
      throw new APIError(`Holiday already exists for ${holidayDateKey}.`, 409)
    }

    const normalizedExisting = existing.map((item) => ({
      date: item.date || new Date().toISOString(),
      id: item.id || undefined,
      name: item.name || 'Holiday',
      type:
        item.type && HOLIDAY_TYPE_VALUES.has(item.type as HolidayTypeValue)
          ? (item.type as HolidayTypeValue)
          : 'national',
    }))

    await payload.update({
      collection: 'holiday-calendars',
      id: calendarId,
      data: {
        holidays: [
          ...normalizedExisting,
          {
            date: new Date(holidayDate).toISOString(),
            name: holidayName,
            type: holidayType,
          },
        ],
      },
      overrideAccess: false,
      user: actor,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'holidayAdded')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to add holiday.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
