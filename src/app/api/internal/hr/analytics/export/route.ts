import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import type { InternalSessionUser } from '@/lib/auth/internal-auth'
import { getPayloadAuthHeaders } from '@/lib/auth/payload-auth-headers'
import {
  buildHRAnalyticsWorkbook,
  getHRAnalyticsWorkbookFilename,
  HR_ANALYTICS_WORKBOOK_MIME,
} from '@/lib/hr/analytics-export'
import { getHRAnalyticsSummary, normalizeHRAnalyticsFilters } from '@/lib/hr/analytics'

export const runtime = 'nodejs'

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
  const auth = await payload.auth({ headers: await getPayloadAuthHeaders(request.headers) })
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
    const workbook = buildHRAnalyticsWorkbook(summary)
    const filename = getHRAnalyticsWorkbookFilename(summary)

    return new Response(workbook, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': HR_ANALYTICS_WORKBOOK_MIME,
      },
      status: 200,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to export analytics workbook.',
      },
      { status: 500 },
    )
  }
}
