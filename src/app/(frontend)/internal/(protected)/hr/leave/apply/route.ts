import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { computeLeaveDays, ensureDefaultLeaveTypes } from '@/lib/hr/leave'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.hr.leave, request.url)

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: await getHeaders() })
  const user = auth.user as InternalUserLike

  if (!user || !hasInternalRole(user, ['leadRecruiter', 'recruiter'])) {
    return NextResponse.redirect(new URL(APP_ROUTES.internal.login, request.url), 303)
  }

  try {
    const formData = await request.formData()
    const leaveTypeId = String(formData.get('leaveTypeId') || '')
    const leaveUnit = String(formData.get('leaveUnit') || 'fullDay')
    const startDate = String(formData.get('startDate') || '')
    const endDate = String(formData.get('endDate') || '')
    const reason = String(formData.get('reason') || '').trim()

    if (!leaveTypeId || !/^\d+$/.test(leaveTypeId) || !startDate || !endDate || !reason) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Leave type, dates, and reason are required.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const reqLike = { payload, user } as any
    await ensureDefaultLeaveTypes(reqLike)

    const employeeProfile = await payload.find({
      collection: 'employee-profiles',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req: reqLike,
      where: {
        user: {
          equals: user.id,
        },
      },
    })

    const employeeID = employeeProfile.docs[0]?.id

    if (!employeeID) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Employee profile not found for current user.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const normalizedUnit = leaveUnit === 'halfDay' ? 'halfDay' : 'fullDay'
    const totalDays = computeLeaveDays({
      endDate,
      leaveUnit: normalizedUnit,
      startDate,
    })

    await payload.create({
      collection: 'leave-requests',
      data: {
        employee: employeeID,
        endDate,
        leaveType: Number(leaveTypeId),
        leaveUnit: normalizedUnit,
        reason,
        startDate,
        status: 'pendingLeadApproval',
        totalDays,
      },
      draft: false,
      overrideAccess: false,
      user,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', 'Leave request submitted.')
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to submit leave request.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
