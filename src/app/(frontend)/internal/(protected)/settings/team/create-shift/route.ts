import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { WEEKDAY_OPTIONS } from '@/lib/constants/hr'
import { APP_ROUTES } from '@/lib/constants/routes'

const WEEKDAY_VALUES = new Set(WEEKDAY_OPTIONS.map((option) => option.value))

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.team.base, request.url)

const readString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.trim() : ''

const readNumber = (value: FormDataEntryValue | null, fallback: number): number => {
  const raw = readString(value)
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

const readBoolean = (value: FormDataEntryValue | null): boolean =>
  readString(value).toLowerCase() === 'on' || readString(value).toLowerCase() === 'true'

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: request.headers })
  const actor = auth.user as InternalUserLike

  if (!actor || !hasInternalRole(actor, ['admin'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.dashboard, request.url), 303)
  }

  try {
    const formData = await request.formData()
    const name = readString(formData.get('name'))
    const shiftStartTime = readString(formData.get('shiftStartTime'))
    const shiftEndTime = readString(formData.get('shiftEndTime'))
    const graceMinutes = readNumber(formData.get('graceMinutes'), 15)
    const halfDayThresholdMinutes = readNumber(formData.get('halfDayThresholdMinutes'), 240)
    const fullDayThresholdMinutes = readNumber(formData.get('fullDayThresholdMinutes'), 480)
    const overtimeThresholdMinutes = readNumber(formData.get('overtimeThresholdMinutes'), 540)
    const notes = readString(formData.get('notes')) || undefined
    const isDefault = readBoolean(formData.get('isDefault'))

    const weeklyOffDays = formData
      .getAll('weeklyOffDays')
      .map((entry) => readString(entry))
      .filter((entry): entry is (typeof WEEKDAY_OPTIONS)[number]['value'] => WEEKDAY_VALUES.has(entry as (typeof WEEKDAY_OPTIONS)[number]['value']))

    if (!name || !shiftStartTime || !shiftEndTime) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Shift name, start time, and end time are required.')
      return NextResponse.redirect(redirectURL, 303)
    }

    await payload.create({
      collection: 'attendance-shifts',
      data: {
        fullDayThresholdMinutes,
        graceMinutes,
        halfDayThresholdMinutes,
        isDefault,
        name,
        notes,
        overtimeThresholdMinutes,
        shiftEndTime,
        shiftStartTime,
        weeklyOffDays: weeklyOffDays.length > 0 ? weeklyOffDays : ['sunday'],
      },
      overrideAccess: false,
      user: actor,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'shiftCreated')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to create shift.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
