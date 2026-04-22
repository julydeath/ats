import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { getOpenAttendanceSession } from '@/lib/hr/attendance'

export async function GET() {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: await getHeaders() })
  const user = auth.user as InternalUserLike

  if (!user || !hasInternalRole(user, ['admin', 'leadRecruiter', 'recruiter'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reqLike = { payload, user } as any

  const employeeProfileResult = await payload.find({
    collection: 'employee-profiles',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    user,
    where: {
      user: {
        equals: user.id,
      },
    },
  })

  const employee = employeeProfileResult.docs[0]
  const employeeID = employee?.id
  const canPunch = hasInternalRole(user, ['leadRecruiter', 'recruiter']) && Boolean(employeeID)
  const openSession = employeeID
    ? await getOpenAttendanceSession({
        employeeID: Number(employeeID),
        req: reqLike,
      })
    : null

  return NextResponse.json({
    canPunch,
    employeeCode: employee?.employeeCode || null,
    employeeID: employeeID || null,
    hasOpenSession: Boolean(openSession?.id),
    openSessionPunchInAt: openSession?.punchInAt || null,
    role: user.role || null,
  })
}
