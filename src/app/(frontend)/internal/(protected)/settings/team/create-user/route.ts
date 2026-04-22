import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.team.base, request.url)

const readString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.trim() : ''

const readOptionalNumber = (value: FormDataEntryValue | null): number | undefined => {
  const raw = readString(value)
  if (!raw || !/^\d+$/.test(raw)) return undefined
  return Number(raw)
}

const toNumberID = (value: number | string | null | undefined): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return undefined
}

const readBoolean = (value: FormDataEntryValue | null): boolean =>
  readString(value).toLowerCase() === 'on' || readString(value).toLowerCase() === 'true'

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: await getHeaders() })
  const actor = auth.user as InternalUserLike

  if (!actor || !hasInternalRole(actor, ['admin', 'leadRecruiter'])) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', 'You are not allowed to perform this action.')
    return NextResponse.redirect(redirectURL, 303)
  }

  let createdUserID: number | string | null = null

  try {
    const formData = await request.formData()
    const fullName = readString(formData.get('fullName'))
    const email = readString(formData.get('email')).toLowerCase()
    const password = readString(formData.get('password'))
    const dateOfJoining = readString(formData.get('dateOfJoining'))
    const designation = readString(formData.get('designation'))
    const department = readString(formData.get('department')) || 'Recruitment'
    const workLocation = readString(formData.get('workLocation'))
    const workState = readString(formData.get('workState'))
    const requestedRole = readString(formData.get('role'))
    const attendanceShiftId = readOptionalNumber(formData.get('attendanceShiftId'))
    const holidayCalendarId = readOptionalNumber(formData.get('holidayCalendarId'))
    const reportingManagerId = readOptionalNumber(formData.get('reportingManagerId'))
    const isPayrollEligible = readBoolean(formData.get('isPayrollEligible'))
    const activateNow = readBoolean(formData.get('activateNow'))

    if (!fullName || !email || !password || !dateOfJoining || !designation || !workLocation || !workState) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Full name, email, password, DOJ, designation, location, and state are required.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const role =
      actor.role === 'leadRecruiter'
        ? 'recruiter'
        : requestedRole === 'leadRecruiter'
          ? 'leadRecruiter'
          : 'recruiter'

    const createdUser = await payload.create({
      collection: 'users',
      data: {
        email,
        fullName,
        isActive: actor.role === 'admin' ? activateNow : false,
        password,
        role,
      },
      overrideAccess: false,
      user: actor,
    })

    createdUserID = createdUser.id
    const createdUserNumericID = toNumberID(createdUser.id)
    const actorNumericID = toNumberID(actor.id)

    if (!createdUserNumericID) {
      throw new Error('Unable to map created user ID for employee onboarding.')
    }

    await payload.create({
      collection: 'employee-profiles',
      data: {
        attendanceShift: attendanceShiftId,
        dateOfJoining,
        department,
        designation,
        employmentStatus: 'active',
        holidayCalendar: holidayCalendarId,
        isPayrollEligible,
        reportingManager:
          actor.role === 'leadRecruiter'
            ? actorNumericID
            : reportingManagerId,
        user: createdUserNumericID,
        workLocation,
        workState,
      },
      overrideAccess: false,
      user: actor,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'memberCreated')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    if (createdUserID) {
      try {
        await payload.delete({
          collection: 'users',
          id: createdUserID,
          overrideAccess: true,
        })
      } catch {
        // Keep original error flow.
      }
    }

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to create internal team member.',
    )
    return NextResponse.redirect(redirectURL, 303)
  }
}
