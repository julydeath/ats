import { describe, expect, it } from 'vitest'

import {
  calculateWorkedMinutes,
  classifyAttendanceFromWorkedMinutes,
} from '@/lib/hr/attendance'
import { computeLeaveDays } from '@/lib/hr/leave'
import { computePayrollLinePreview } from '@/lib/hr/payroll'
import { computePerformanceFinalScore } from '@/lib/hr/performance'
import { mapRazorpayPayoutStatus } from '@/lib/payments/razorpayx'

describe('HR Utility Calculations', () => {
  it('computes worked minutes between punch in and out', () => {
    const worked = calculateWorkedMinutes('2026-04-10T03:30:00.000Z', '2026-04-10T12:30:00.000Z')
    expect(worked).toBe(540)
  })

  it('classifies attendance status from worked minutes', () => {
    expect(
      classifyAttendanceFromWorkedMinutes({
        fullDayMinutes: 480,
        halfDayMinutes: 240,
        workedMinutes: 500,
      }),
    ).toBe('present')

    expect(
      classifyAttendanceFromWorkedMinutes({
        fullDayMinutes: 480,
        halfDayMinutes: 240,
        workedMinutes: 300,
      }),
    ).toBe('halfDay')

    expect(
      classifyAttendanceFromWorkedMinutes({
        fullDayMinutes: 480,
        halfDayMinutes: 240,
        workedMinutes: 0,
      }),
    ).toBe('absent')
  })

  it('calculates leave days for full-day and half-day requests', () => {
    const fullDays = computeLeaveDays({
      endDate: '2026-04-05',
      leaveUnit: 'fullDay',
      startDate: '2026-04-01',
    })

    const halfDay = computeLeaveDays({
      endDate: '2026-04-01',
      leaveUnit: 'halfDay',
      startDate: '2026-04-01',
    })

    expect(fullDays).toBe(5)
    expect(halfDay).toBe(0.5)
  })

  it('calculates weighted performance final score', () => {
    const score = computePerformanceFinalScore({
      kpiScore: 80,
      kpiWeight: 70,
      managerRating: 4,
      managerWeight: 30,
    })

    expect(score).toBe(80)
  })

  it('computes payroll line with deductions and net pay', () => {
    const line = computePayrollLinePreview({
      compensation: {
        basicMonthly: 30000,
        customDeductions: [],
        customEarnings: [],
        esiEnabled: false,
        hraMonthly: 15000,
        lwfEnabled: true,
        monthlyGross: 60000,
        otherAllowanceMonthly: 5000,
        pfEnabled: true,
        professionalTaxEnabled: true,
        reimbursementMonthly: 2000,
        specialAllowanceMonthly: 8000,
        tdsEnabled: true,
        variableMonthly: 2000,
      },
      lopDays: 1,
      ruleSet: {
        esiEnabled: true,
        lwfEmployeeMonthly: 20,
        lwfEnabled: true,
        lwfEmployerMonthly: 40,
        pfEmployeeRate: 12,
        pfEnabled: true,
        pfEmployerRate: 12,
        pfWageCap: 15000,
        professionalTaxEnabled: true,
        professionalTaxMonthly: 200,
        standardDeductionMonthly: 0,
        tdsEnabled: true,
        tdsRate: 5,
      },
      totalDays: 30,
    })

    expect(line.grossEarnings).toBeGreaterThan(0)
    expect(line.totalDeductions).toBeGreaterThan(0)
    expect(line.netPayable).toBeGreaterThan(0)
    expect(line.employeeDeductions.pf).toBeGreaterThan(0)
  })

  it('maps Razorpay payout statuses to platform statuses', () => {
    expect(mapRazorpayPayoutStatus('processed')).toBe('processed')
    expect(mapRazorpayPayoutStatus('queued')).toBe('processing')
    expect(mapRazorpayPayoutStatus('failed')).toBe('failed')
    expect(mapRazorpayPayoutStatus('reversed')).toBe('reversed')
  })
})
