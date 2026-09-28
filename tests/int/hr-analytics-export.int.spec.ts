import { describe, expect, it } from 'vitest'

import {
  buildHRAnalyticsWorkbook,
  getHRAnalyticsWorkbookFilename,
  HR_ANALYTICS_WORKBOOK_MIME,
} from '@/lib/hr/analytics-export'
import type { HRAnalyticsSummary } from '@/lib/hr/analytics'

const summary: HRAnalyticsSummary = {
  employeeRows: [
    {
      applicationsAdded: 12,
      attendancePct: 96.5,
      employeeCode: 'EMP-001',
      employeeId: 1,
      interviewsScheduled: 4,
      jobsCreated: 3,
      leaveDays: 1,
      lopDays: 0,
      managedClients: 2,
      name: 'Analytics Admin',
      placementsClosed: 1,
      role: 'admin',
      score: 91,
      stageMoves: 18,
      state: 'Karnataka',
    },
  ],
  employeeSelectors: [],
  filters: {
    employeeId: null,
    fromISO: '2026-09-01T00:00:00.000Z',
    role: 'all',
    spanDays: 28,
    state: null,
    toISO: '2026-09-28T23:59:59.999Z',
  },
  kpis: {
    approvedLeaveDays: 1,
    attendanceCompliancePct: 96.5,
    avgPerformanceScore: 91,
    interviewsScheduled: 4,
    jobsCreated: 3,
    lopDays: 0,
    payrollGross: 120000,
    payrollNet: 98000,
    payoutSuccessPct: 100,
    sourcedApplications: 12,
    stageMoves: 18,
    totalActiveClients: 2,
    workforce: 1,
  },
  leaveBreakdown: [
    {
      days: 1,
      key: 'CASUAL',
      label: 'Casual Leave',
      requests: 1,
    },
  ],
  payrollTrend: [
    {
      gross: 120000,
      label: 'Sep 26',
      net: 98000,
    },
  ],
  trend: [
    {
      absent: 0,
      applications: 12,
      dateISO: '2026-09-01',
      halfDay: 0,
      interviews: 4,
      label: '01 Sep',
      leave: 1,
      lop: 0,
      placements: 1,
      present: 20,
    },
  ],
}

describe('HR analytics Excel export', () => {
  it('builds an xlsx workbook with employee analytics sheets', () => {
    const workbook = buildHRAnalyticsWorkbook(summary)
    const workbookText = workbook.toString('utf8')

    expect(HR_ANALYTICS_WORKBOOK_MIME).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(getHRAnalyticsWorkbookFilename(summary)).toBe(
      'hr-analytics-2026-09-01-to-2026-09-28.xlsx',
    )
    expect(workbook.subarray(0, 4).toString('utf8')).toBe('PK\u0003\u0004')
    expect(workbookText).toContain('Employee Analytics')
    expect(workbookText).toContain('KPI Summary')
    expect(workbookText).toContain('Analytics Admin')
  })
})
