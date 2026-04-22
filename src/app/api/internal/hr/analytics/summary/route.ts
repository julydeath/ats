import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import type { InternalSessionUser } from '@/lib/auth/internal-auth'
import { getHRAnalyticsSummary, normalizeHRAnalyticsFilters } from '@/lib/hr/analytics'

type AuthenticatedInternalUser = {
  email?: string | null
  fullName?: string | null
  id: number | string
  isActive?: boolean | null
  role: InternalSessionUser['role']
}

const toSessionUser = (user: AuthenticatedInternalUser): InternalSessionUser => ({
  email: String(user.email || ''),
  fullName: user.fullName || null,
  id: user.id,
  isActive: user.isActive ?? true,
  role: user.role as InternalSessionUser['role'],
})

export async function GET(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const auth = await payload.auth({ headers: request.headers })
  const user = auth.user as AuthenticatedInternalUser | null | undefined

  if (!user || !hasInternalRole(user as InternalUserLike, ['admin'])) {
    return NextResponse.json(
      { error: 'Forbidden: You are not allowed to perform this action.' },
      { status: 403 },
    )
  }

  try {
    const requestURL = new URL(request.url)

    const filters = normalizeHRAnalyticsFilters({
      employeeId: requestURL.searchParams.get('employeeId'),
      from: requestURL.searchParams.get('from'),
      role: requestURL.searchParams.get('role'),
      state: requestURL.searchParams.get('state'),
      to: requestURL.searchParams.get('to'),
    })

    const summary = await getHRAnalyticsSummary({
      filters,
      payload,
      user: toSessionUser(user),
    })

    return NextResponse.json(summary, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to load analytics summary.',
      },
      { status: 500 },
    )
  }
}
