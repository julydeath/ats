import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { getOpenAttendanceSession } from '@/lib/hr/attendance'

export async function POST() {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: await getHeaders() })
  const user = auth.user as InternalUserLike

  if (!user || !hasInternalRole(user, ['leadRecruiter', 'recruiter'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const reqLike = { payload, user } as any

    const employeeProfile = await payload.find({
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

    const employeeID = employeeProfile.docs[0]?.id
    if (!employeeID) {
      return NextResponse.json({ error: 'Employee profile not found for current user.' }, { status: 400 })
    }

    const openSession = await getOpenAttendanceSession({
      employeeID: Number(employeeID),
      req: reqLike,
    })

    if (!openSession?.id) {
      return NextResponse.json({ error: 'No open attendance session found.' }, { status: 409 })
    }

    await payload.update({
      collection: 'attendance-logs',
      data: {
        punchOutAt: new Date().toISOString(),
      },
      id: openSession.id,
      overrideAccess: false,
      user,
    })

    return NextResponse.json({ message: 'Punch-out captured successfully.' }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to punch out.' },
      { status: 500 },
    )
  }
}
