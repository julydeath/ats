import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { readCurrentInternalUser } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { generatePayrollRun } from '@/lib/hr/payroll'

const buildRedirectURL = (request: Request): URL =>
  new URL(APP_ROUTES.internal.hr.payroll, request.url)

const isLegacyPayrollCycleUniqueViolation = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typed = error as { code?: string; message?: string }
  const message = String(typed.message || '').toLowerCase()

  return (
    typed.code === '23505' &&
    message.includes('payroll_cycles') &&
    message.includes('month') &&
    message.includes('year')
  )
}

const dropLegacyPayrollCycleMonthYearUniqueIndexes = async (payload: Awaited<ReturnType<typeof getPayload>>) => {
  const db = payload.db as { pool?: { query?: (sql: string, params?: unknown[]) => Promise<{ rows?: Array<{ indexname?: string }> }> } } | undefined

  if (!db?.pool?.query) return false

  const indexesResult = await db.pool.query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = ANY (current_schemas(false))
        AND tablename = 'payroll_cycles'
        AND indexdef ILIKE '%UNIQUE%'
        AND indexdef ILIKE '%month%'
        AND indexdef ILIKE '%year%'
    `,
  )

  const indexNames = (indexesResult.rows || [])
    .map((row) => (row?.indexname ? String(row.indexname) : ''))
    .filter(Boolean)

  if (indexNames.length === 0) return false

  for (const indexName of indexNames) {
    const safeIdentifier = indexName.replace(/"/g, '""')
    await db.pool.query(`DROP INDEX IF EXISTS "${safeIdentifier}"`)
  }

  return true
}

export async function POST(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const user = await readCurrentInternalUser()

  if (!user || !user.isActive || user.role !== 'admin') {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', 'You are not allowed to perform this action.')
    return NextResponse.redirect(redirectURL, 303)
  }

  try {
    const reqLike = { payload, user } as any
    const formData = await request.formData()
    const actionType = String(formData.get('actionType') || 'generateRun')

    if (actionType === 'createCycle') {
      const month = Number(formData.get('month') || 0)
      const year = Number(formData.get('year') || 0)
      const startDate = String(formData.get('startDate') || '')
      const endDate = String(formData.get('endDate') || '')
      const payoutDate = String(formData.get('payoutDate') || '')

      if (!month || !year || !startDate || !endDate) {
        const redirectURL = buildRedirectURL(request)
        redirectURL.searchParams.set('error', 'Month, year, and cycle date range are required.')
        return NextResponse.redirect(redirectURL, 303)
      }

      const cycleData = {
        endDate,
        month,
        payoutDate: payoutDate || undefined,
        startDate,
        status: 'open',
        title: `Payroll ${month}/${year}`,
        year,
      } as const

      try {
        await payload.create({
          collection: 'payroll-cycles',
          data: cycleData,
          draft: false,
          overrideAccess: true,
          req: reqLike,
        })
      } catch (error) {
        if (!isLegacyPayrollCycleUniqueViolation(error)) {
          throw error
        }

        const droppedLegacyIndex = await dropLegacyPayrollCycleMonthYearUniqueIndexes(payload)

        if (!droppedLegacyIndex) {
          throw error
        }

        await payload.create({
          collection: 'payroll-cycles',
          data: cycleData,
          draft: false,
          overrideAccess: true,
          req: reqLike,
        })
      }

      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('success', 'Payroll cycle created.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const cycleId = String(formData.get('cycleId') || '')
    const ruleSetId = String(formData.get('ruleSetId') || '')

    if (!cycleId || !/^\d+$/.test(cycleId)) {
      const redirectURL = buildRedirectURL(request)
      redirectURL.searchParams.set('error', 'Payroll cycle is required to generate run.')
      return NextResponse.redirect(redirectURL, 303)
    }

    const run = await generatePayrollRun({
      cycleID: Number(cycleId),
      req: reqLike,
      ruleSetID: /^\d+$/.test(ruleSetId) ? Number(ruleSetId) : undefined,
    })

    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('success', `Payroll run ${String(run.payrollRunCode || run.id)} generated.`)
    return NextResponse.redirect(redirectURL, 303)
  } catch (error) {
    const redirectURL = buildRedirectURL(request)
    redirectURL.searchParams.set('error', error instanceof Error ? error.message : 'Unable to process payroll generation.')
    return NextResponse.redirect(redirectURL, 303)
  }
}
