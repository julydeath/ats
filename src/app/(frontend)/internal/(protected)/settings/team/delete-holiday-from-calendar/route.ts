import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { APIError, getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

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
    const holidayDate = readString(formData.get('holidayDate'))
    const holidayName = readString(formData.get('holidayName'))

    if (!calendarId || !holidayDate) {
      throw new APIError('Calendar and holiday date are required.', 400)
    }

    const calendar = await payload.findByID({
      collection: 'holiday-calendars',
      depth: 0,
      id: calendarId,
      overrideAccess: false,
      user: actor,
    })

    const existing = Array.isArray(calendar.holidays) ? [...calendar.holidays] : []
    const targetDate = new Date(holidayDate).toISOString().slice(0, 10)

    const filtered = existing.filter((item) => {
      if (!item?.date) return true
      const itemDate = new Date(item.date).toISOString().slice(0, 10)
      if (itemDate !== targetDate) return true
      if (holidayName && item.name && item.name !== holidayName) return true
      return false
    })

    await payload.update({
      collection: 'holiday-calendars',
      id: calendarId,
      data: {
        holidays: filtered,
      },
      overrideAccess: false,
      user: actor,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'holidayRemoved')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to remove holiday.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
