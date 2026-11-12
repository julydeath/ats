import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { WEEKDAY_OPTIONS } from '@/lib/constants/hr'
import { APP_ROUTES } from '@/lib/constants/routes'
import { getPayloadAuthHeaders } from '@/lib/auth/payload-auth-headers'
import { extractRelationshipID } from '@/lib/utils/relationships'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.team.base, request.url)

const readString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.trim() : ''

const readOptionalID = (value: FormDataEntryValue | null): number | null => {
  const raw = readString(value)
  if (!raw || !/^\d+$/.test(raw)) return null
  return Number(raw)
}

const readBoolean = (value: FormDataEntryValue | null): boolean =>
  readString(value).toLowerCase() === 'on' || readString(value).toLowerCase() === 'true'

const VALID_WEEKDAYS = new Set<string>(WEEKDAY_OPTIONS.map((option) => option.value))

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: await getPayloadAuthHeaders(request.headers) })
  const actor = auth.user as InternalUserLike

  if (!actor || !hasInternalRole(actor, ['admin', 'leadRecruiter'])) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', 'You are not allowed to perform this action.')
    return NextResponse.redirect(redirectURL, 303)
  }

  const formData = await request.formData()
  const profileID = readOptionalID(formData.get('profileId'))

  const redirectWithError = (message: string) => {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', message)
    if (profileID) redirectURL.searchParams.set('edit', String(profileID))
    return NextResponse.redirect(redirectURL, 303)
  }

  if (!profileID) {
    return redirectWithError('Valid employee profile is required.')
  }

  try {
    const profile = await payload.findByID({
      collection: 'employee-profiles',
      depth: 1,
      id: profileID,
      overrideAccess: false,
      user: actor,
    })

    // Lead recruiters manage only their own profile and recruiter profiles (mirrors the team directory scope).
    if (actor.role === 'leadRecruiter') {
      const profileUser = profile.user && typeof profile.user === 'object' ? profile.user : null
      const profileUserID = extractRelationshipID(profile.user)
      const isSelf = profileUserID !== null && String(profileUserID) === String(actor.id)
      const isRecruiter = profileUser?.role === 'recruiter'

      if (!isSelf && !isRecruiter) {
        return redirectWithError('Lead recruiters can only edit recruiter profiles.')
      }
    }

    const designation = readString(formData.get('designation'))
    const department = readString(formData.get('department'))
    const workLocation = readString(formData.get('workLocation'))
    const workState = readString(formData.get('workState'))
    const dateOfJoining = readString(formData.get('dateOfJoining'))

    if (!designation || !workLocation || !workState || !dateOfJoining) {
      return redirectWithError('Designation, date of joining, work location, and work state are required.')
    }

    const weeklyOffDays = formData
      .getAll('weeklyOffDays')
      .map((value) => readString(value))
      .filter((value) => VALID_WEEKDAYS.has(value))

    const data: Record<string, unknown> = {
      attendanceShift: readOptionalID(formData.get('attendanceShiftId')),
      dateOfJoining: new Date(dateOfJoining).toISOString(),
      department: department || 'Recruitment',
      designation,
      holidayCalendar: readOptionalID(formData.get('holidayCalendarId')),
      isPayrollEligible: readBoolean(formData.get('isPayrollEligible')),
      weeklyOffDays,
      workLocation,
      workState,
    }

    if (actor.role === 'admin') {
      data.reportingManager = readOptionalID(formData.get('reportingManagerId'))
    }

    await payload.update({
      collection: 'employee-profiles',
      data,
      id: profileID,
      overrideAccess: false,
      user: actor,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'profileUpdated')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    return redirectWithError(error instanceof Error ? error.message : 'Unable to update employee profile.')
  }
}
