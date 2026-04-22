import crypto from 'crypto'
import { APIError, type PayloadRequest, type Where } from 'payload'

import { createRazorpayXPayout, isRazorpayXConfigured, mapRazorpayPayoutStatus } from '@/lib/payments/razorpayx'
import { readRelationID } from '@/lib/hr/common'
import type {
  EmployeeCompensation,
  EmployeeProfile,
  PayrollCycle,
  PayrollLineItem,
  PayrollPayoutTransaction,
  PayrollRuleSet,
  PayrollRun,
} from '@/payload-types'

type LooseRecord = Record<string, unknown>

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

const toDate = (value: unknown): Date | null => {
  if (typeof value !== 'string') {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const buildIdempotencyKey = ({
  employeeID,
  payrollRunID,
}: {
  employeeID: number
  payrollRunID: number
}): string => {
  const raw = `${String(payrollRunID)}-${String(employeeID)}-${Date.now()}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 40)
}

const findCompensation = async ({
  asOf,
  employeeID,
  req,
}: {
  asOf: Date
  employeeID: number
  req: PayloadRequest
}): Promise<EmployeeCompensation | undefined> => {
  const result = await req.payload.find({
    collection: 'employee-compensation',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    sort: '-effectiveFrom',
    where: {
      and: [
        {
          employee: {
            equals: employeeID,
          },
        },
        {
          effectiveFrom: {
            less_than_equal: asOf.toISOString(),
          },
        },
        {
          or: [
            {
              effectiveTo: {
                exists: false,
              },
            },
            {
              effectiveTo: {
                greater_than_equal: asOf.toISOString(),
              },
            },
          ],
        },
      ],
    },
  })

  return result.docs[0]
}

const findRuleSet = async ({
  asOf,
  req,
  ruleSetID,
  state,
}: {
  asOf: Date
  req: PayloadRequest
  ruleSetID?: number | null
  state?: string | null
}): Promise<PayrollRuleSet | undefined> => {
  if (ruleSetID) {
    return req.payload.findByID({
      collection: 'payroll-rule-sets',
      depth: 0,
      id: ruleSetID,
      overrideAccess: true,
      req,
    })
  }

  const where: Where = {
    and: [
      ...(state
        ? [
            {
              state: {
                equals: state,
              },
            },
          ]
        : []),
      {
        effectiveFrom: {
          less_than_equal: asOf.toISOString(),
        },
      },
      {
        isActive: {
          equals: true,
        },
      },
    ],
  }

  const result = await req.payload.find({
    collection: 'payroll-rule-sets',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    sort: '-effectiveFrom',
    where,
  })

  return result.docs[0]
}

const countLopDays = async ({
  employeeID,
  endDate,
  req,
  startDate,
}: {
  employeeID: number
  endDate: Date
  req: PayloadRequest
  startDate: Date
}): Promise<number> => {
  const summaries = await req.payload.find({
    collection: 'attendance-daily-summaries',
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        {
          employee: {
            equals: employeeID,
          },
        },
        {
          lop: {
            equals: true,
          },
        },
        {
          date: {
            greater_than_equal: startDate.toISOString(),
          },
        },
        {
          date: {
            less_than_equal: endDate.toISOString(),
          },
        },
      ],
    },
  })

  return summaries.totalDocs
}

const round = (value: number): number => Math.round(value * 100) / 100

type PayrollComputedLine = {
  customDeductionsTotal: number
  customEarningsTotal: number
  deductionsBreakdown: Array<{ amount: number; code: string; label: string }>
  earningsBreakdown: Array<{ amount: number; code: string; label: string }>
  employeeDeductions: {
    esi: number
    lwf: number
    pf: number
    professionalTax: number
    tds: number
  }
  employerContributions: {
    esi: number
    lwf: number
    pf: number
  }
  grossEarnings: number
  lopDeduction: number
  lopDays: number
  netPayable: number
  reimbursements: number
  totalDeductions: number
}

const computeLine = ({
  compensation,
  lopDays,
  ruleSet,
  totalDays,
}: {
  compensation: EmployeeCompensation | LooseRecord
  lopDays: number
  ruleSet: PayrollRuleSet | LooseRecord
  totalDays: number
}): PayrollComputedLine => {
  const basicMonthly = toNumber(compensation.basicMonthly)
  const hraMonthly = toNumber(compensation.hraMonthly)
  const specialAllowanceMonthly = toNumber(compensation.specialAllowanceMonthly)
  const variableMonthly = toNumber(compensation.variableMonthly)
  const otherAllowanceMonthly = toNumber(compensation.otherAllowanceMonthly)
  const reimbursementMonthly = toNumber(compensation.reimbursementMonthly)

  const customEarnings = Array.isArray(compensation.customEarnings)
    ? (compensation.customEarnings as Array<Record<string, unknown>>)
    : []
  const customDeductions = Array.isArray(compensation.customDeductions)
    ? (compensation.customDeductions as Array<Record<string, unknown>>)
    : []

  const customEarningsTotal = round(
    customEarnings.reduce((sum, item) => sum + toNumber(item.amount), 0),
  )
  const customDeductionsTotal = round(
    customDeductions.reduce((sum, item) => sum + toNumber(item.amount), 0),
  )

  const monthlyGross = round(
    toNumber(compensation.monthlyGross) ||
      basicMonthly + hraMonthly + specialAllowanceMonthly + variableMonthly + otherAllowanceMonthly,
  )

  const safeTotalDays = Math.max(totalDays, 1)
  const payableDays = Math.max(0, safeTotalDays - lopDays)
  const attendanceFactor = payableDays / safeTotalDays

  const proratedBasic = round(basicMonthly * attendanceFactor)
  const proratedHra = round(hraMonthly * attendanceFactor)
  const proratedSpecial = round(specialAllowanceMonthly * attendanceFactor)
  const proratedVariable = round(variableMonthly * attendanceFactor)
  const proratedOther = round(otherAllowanceMonthly * attendanceFactor)
  const reimbursements = round(reimbursementMonthly * attendanceFactor)
  const grossEarnings = round(
    proratedBasic + proratedHra + proratedSpecial + proratedVariable + proratedOther + customEarningsTotal + reimbursements,
  )

  const lopDeduction = round(monthlyGross - (monthlyGross * attendanceFactor))

  const pfEnabled = compensation.pfEnabled !== false && ruleSet.pfEnabled !== false
  const pfRateEmployee = toNumber(ruleSet.pfEmployeeRate, 12)
  const pfRateEmployer = toNumber(ruleSet.pfEmployerRate, 12)
  const pfWageCap = toNumber(ruleSet.pfWageCap, 15000)
  const pfBase = round(Math.min(proratedBasic, pfWageCap))
  const pfEmployee = pfEnabled ? round((pfBase * pfRateEmployee) / 100) : 0
  const pfEmployer = pfEnabled ? round((pfBase * pfRateEmployer) / 100) : 0

  const esiEnabled = compensation.esiEnabled === true && ruleSet.esiEnabled === true
  const esiEmployeeRate = toNumber(ruleSet.esiEmployeeRate, 0.75)
  const esiEmployerRate = toNumber(ruleSet.esiEmployerRate, 3.25)
  const esiThreshold = toNumber(ruleSet.esiWageThreshold, 21000)
  const esiEligible = esiEnabled && grossEarnings <= esiThreshold
  const esiEmployee = esiEligible ? round((grossEarnings * esiEmployeeRate) / 100) : 0
  const esiEmployer = esiEligible ? round((grossEarnings * esiEmployerRate) / 100) : 0

  const professionalTaxEnabled =
    compensation.professionalTaxEnabled !== false && ruleSet.professionalTaxEnabled !== false
  const professionalTax = professionalTaxEnabled ? round(toNumber(ruleSet.professionalTaxMonthly, 200)) : 0

  const lwfEnabled = compensation.lwfEnabled === true && ruleSet.lwfEnabled === true
  const lwfEmployee = lwfEnabled ? round(toNumber(ruleSet.lwfEmployeeMonthly, 20)) : 0
  const lwfEmployer = lwfEnabled ? round(toNumber(ruleSet.lwfEmployerMonthly, 40)) : 0

  const tdsEnabled = compensation.tdsEnabled !== false && ruleSet.tdsEnabled !== false
  const standardDeduction = round(toNumber(ruleSet.standardDeductionMonthly, 0))
  const tdsRate = toNumber(ruleSet.tdsRate, 0)
  const taxableBase = Math.max(0, grossEarnings - standardDeduction)
  const tds = tdsEnabled ? round((taxableBase * tdsRate) / 100) : 0

  const totalDeductions = round(
    pfEmployee + esiEmployee + professionalTax + lwfEmployee + tds + customDeductionsTotal,
  )
  const netPayable = round(Math.max(0, grossEarnings - totalDeductions))

  return {
    customDeductionsTotal,
    customEarningsTotal,
    deductionsBreakdown: [
      { amount: pfEmployee, code: 'PF_EMP', label: 'PF Employee' },
      { amount: esiEmployee, code: 'ESI_EMP', label: 'ESI Employee' },
      { amount: professionalTax, code: 'PT', label: 'Professional Tax' },
      { amount: lwfEmployee, code: 'LWF_EMP', label: 'LWF Employee' },
      { amount: tds, code: 'TDS', label: 'TDS' },
      ...customDeductions.map((item, index) => ({
        amount: round(toNumber(item.amount)),
        code: `CUSTOM_DED_${index + 1}`,
        label: String(item.label || `Custom Deduction ${index + 1}`),
      })),
    ],
    earningsBreakdown: [
      { amount: proratedBasic, code: 'BASIC', label: 'Basic' },
      { amount: proratedHra, code: 'HRA', label: 'HRA' },
      { amount: proratedSpecial, code: 'SPECIAL', label: 'Special Allowance' },
      { amount: proratedVariable, code: 'VARIABLE', label: 'Variable Pay' },
      { amount: proratedOther, code: 'OTHER', label: 'Other Allowances' },
      { amount: reimbursements, code: 'REIMBURSE', label: 'Reimbursements' },
      ...customEarnings.map((item, index) => ({
        amount: round(toNumber(item.amount)),
        code: `CUSTOM_EARN_${index + 1}`,
        label: String(item.label || `Custom Earning ${index + 1}`),
      })),
    ],
    employeeDeductions: {
      esi: esiEmployee,
      lwf: lwfEmployee,
      pf: pfEmployee,
      professionalTax,
      tds,
    },
    employerContributions: {
      esi: esiEmployer,
      lwf: lwfEmployer,
      pf: pfEmployer,
    },
    grossEarnings,
    lopDeduction,
    lopDays,
    netPayable,
    reimbursements,
    totalDeductions,
  }
}

export const computePayrollLinePreview = ({
  compensation,
  lopDays,
  ruleSet,
  totalDays,
}: {
  compensation: EmployeeCompensation | LooseRecord
  lopDays: number
  ruleSet: PayrollRuleSet | LooseRecord
  totalDays: number
}) =>
  computeLine({
    compensation,
    lopDays,
    ruleSet,
    totalDays,
  })

const runTotalsFromItems = (
  items: Array<{ grossEarnings: number; netPayable: number; totalDeductions: number }>,
) => ({
  totalDeductions: round(items.reduce((sum, item) => sum + item.totalDeductions, 0)),
  totalEmployees: items.length,
  totalGross: round(items.reduce((sum, item) => sum + item.grossEarnings, 0)),
  totalNet: round(items.reduce((sum, item) => sum + item.netPayable, 0)),
})

export const generatePayrollRun = async ({
  cycleID,
  req,
  ruleSetID,
}: {
  cycleID: number
  req: PayloadRequest
  ruleSetID?: number | null
}): Promise<PayrollRun> => {
  const cycle: PayrollCycle = await req.payload.findByID({
    collection: 'payroll-cycles',
    depth: 0,
    id: cycleID,
    overrideAccess: true,
    req,
  })

  const cycleStart = toDate(cycle.startDate)
  const cycleEnd = toDate(cycle.endDate)

  if (!cycleStart || !cycleEnd) {
    throw new APIError('Payroll cycle dates are required.', 400)
  }

  const existingRun = await req.payload.find({
    collection: 'payroll-runs',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        {
          payrollCycle: {
            equals: cycleID,
          },
        },
        {
          status: {
            not_equals: 'cancelled',
          },
        },
      ],
    },
  })

  if (existingRun.totalDocs > 0) {
    throw new APIError('A payroll run already exists for this cycle.', 409)
  }

  const employees = await req.payload.find({
    collection: 'employee-profiles',
    depth: 0,
    limit: 500,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        {
          employmentStatus: {
            equals: 'active',
          },
        },
        {
          isPayrollEligible: {
            equals: true,
          },
        },
      ],
    },
  })

  const preparedBy = readRelationID(req.user?.id) || undefined

  const run = await req.payload.create({
    collection: 'payroll-runs',
    data: {
      approvedAt: undefined,
      approvedBy: undefined,
      disbursedAt: undefined,
      disbursedBy: undefined,
      notes: 'Generated from payroll engine.',
      payrollCycle: cycle.id,
      preparedAt: new Date().toISOString(),
      preparedBy,
      ruleSet: ruleSetID || undefined,
      status: 'draft',
      totalDeductions: 0,
      totalEmployees: 0,
      totalGross: 0,
      totalNet: 0,
    },
    draft: false,
    overrideAccess: true,
    req,
  })

  const runID = readRelationID(run.id)
  if (!runID) {
    throw new APIError('Failed to create payroll run.', 500)
  }

  const totalDays = Math.max(
    1,
    Math.floor((cycleEnd.getTime() - cycleStart.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  )

  const computedItems: Array<{ grossEarnings: number; netPayable: number; totalDeductions: number }> = []

  for (const employee of employees.docs) {
    const employeeID = readRelationID(employee.id)
    if (!employeeID) {
      continue
    }

    const compensation = await findCompensation({
      asOf: cycleEnd,
      employeeID,
      req,
    })

    if (!compensation) {
      continue
    }

    const state = typeof employee.workState === 'string' ? employee.workState : null
    const ruleSet = await findRuleSet({
      asOf: cycleEnd,
      req,
      ruleSetID,
      state,
    })

    if (!ruleSet) {
      continue
    }

    const lopDays = await countLopDays({
      employeeID,
      endDate: cycleEnd,
      req,
      startDate: cycleStart,
    })

    const line = computeLine({
      compensation,
      lopDays,
      ruleSet,
      totalDays,
    })

    computedItems.push({
      grossEarnings: line.grossEarnings,
      netPayable: line.netPayable,
      totalDeductions: line.totalDeductions,
    })

    const lineItem = await req.payload.create({
      collection: 'payroll-line-items',
      data: {
        compensation: readRelationID(compensation.id) || undefined,
        customDeductionsTotal: line.customDeductionsTotal,
        customEarningsTotal: line.customEarningsTotal,
        deductionsBreakdown: line.deductionsBreakdown,
        earningsBreakdown: line.earningsBreakdown,
        employee: employeeID,
        esiEmployee: line.employeeDeductions.esi,
        esiEmployer: line.employerContributions.esi,
        grossEarnings: line.grossEarnings,
        lopDeduction: line.lopDeduction,
        lopDays: line.lopDays,
        lwfEmployee: line.employeeDeductions.lwf,
        lwfEmployer: line.employerContributions.lwf,
        netPayable: line.netPayable,
        payrollRun: runID,
        pfEmployee: line.employeeDeductions.pf,
        pfEmployer: line.employerContributions.pf,
        professionalTax: line.employeeDeductions.professionalTax,
        reimbursementTotal: line.reimbursements,
        status: 'created',
        tds: line.employeeDeductions.tds,
        totalDeductions: line.totalDeductions,
      },
      draft: false,
      overrideAccess: true,
      req,
    })

    const lineItemID = readRelationID(lineItem.id)

    await req.payload.create({
      collection: 'payslips',
      data: {
        employee: employeeID,
        issueDate: new Date().toISOString(),
        month: toNumber(cycle.month),
        payrollRun: runID,
        pdfURL: undefined,
        snapshot: {
          cycleEnd: cycleEnd.toISOString(),
          cycleStart: cycleStart.toISOString(),
          deductions: line.deductionsBreakdown,
          earnings: line.earningsBreakdown,
          netPayable: line.netPayable,
        },
        status: 'generated',
        year: toNumber(cycle.year),
        payrollLineItem: lineItemID || undefined,
      },
      draft: false,
      overrideAccess: true,
      req,
    })
  }

  const totals = runTotalsFromItems(computedItems)

  return req.payload.update({
    collection: 'payroll-runs',
    data: totals,
    id: runID,
    overrideAccess: true,
    req,
  })
}

export const lockPayrollRun = async ({
  req,
  runID,
}: {
  req: PayloadRequest
  runID: number
}) => {
  const run: PayrollRun = await req.payload.findByID({
    collection: 'payroll-runs',
    depth: 0,
    id: runID,
    overrideAccess: true,
    req,
  })

  if (run.status !== 'draft') {
    throw new APIError('Only draft payroll runs can be locked.', 400)
  }

  return req.payload.update({
    collection: 'payroll-runs',
    data: {
      preparedAt: run.preparedAt || new Date().toISOString(),
      preparedBy: run.preparedBy || readRelationID(req.user?.id) || undefined,
      status: 'locked',
    },
    id: runID,
    overrideAccess: true,
    req,
  })
}

export const approvePayrollRun = async ({
  req,
  runID,
}: {
  req: PayloadRequest
  runID: number
}) => {
  const run: PayrollRun = await req.payload.findByID({
    collection: 'payroll-runs',
    depth: 0,
    id: runID,
    overrideAccess: true,
    req,
  })

  if (run.status !== 'locked') {
    throw new APIError('Only locked payroll runs can be approved.', 400)
  }

  const approverID = readRelationID(req.user?.id)
  const makerID = readRelationID(run.preparedBy)

  if (!approverID) {
    throw new APIError('Approver identity missing.', 401)
  }

  const activeAdmins = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
    req,
    where: {
      and: [
        {
          role: {
            equals: 'admin',
          },
        },
        {
          isActive: {
            equals: true,
          },
        },
      ],
    },
  })

  const enforceMakerChecker = activeAdmins.totalDocs >= 2
  const makerAndCheckerSame = makerID && String(makerID) === String(approverID)

  if (enforceMakerChecker && makerAndCheckerSame) {
    throw new APIError('Maker and checker must be different users.', 400)
  }

  const singleAdminApprovalNote =
    !enforceMakerChecker && makerAndCheckerSame
      ? `Single-admin override: maker and checker are the same user (${new Date().toISOString()}).`
      : null

  return req.payload.update({
    collection: 'payroll-runs',
    data: {
      approvedAt: new Date().toISOString(),
      approvedBy: approverID,
      notes: singleAdminApprovalNote
        ? [String(run.notes || ''), singleAdminApprovalNote].filter(Boolean).join('\n')
        : run.notes,
      status: 'approved',
    },
    id: runID,
    overrideAccess: true,
    req,
  })
}

export const disbursePayrollRun = async ({
  req,
  runID,
}: {
  req: PayloadRequest
  runID: number
}) => {
  const run: PayrollRun = await req.payload.findByID({
    collection: 'payroll-runs',
    depth: 0,
    id: runID,
    overrideAccess: true,
    req,
  })

  if (run.status !== 'approved') {
    throw new APIError('Only approved payroll runs can be disbursed.', 400)
  }

  await req.payload.update({
    collection: 'payroll-runs',
    data: {
      disbursedBy: readRelationID(req.user?.id) || undefined,
      status: 'disbursing',
    },
    id: runID,
    overrideAccess: true,
    req,
  })

  const lineItems = await req.payload.find({
    collection: 'payroll-line-items',
    depth: 1,
    limit: 500,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      payrollRun: {
        equals: runID,
      },
    },
  })

  let failedCount = 0

  for (const lineItem of lineItems.docs as PayrollLineItem[]) {
    const lineItemID = readRelationID(lineItem.id)
    const employeeID = readRelationID(lineItem.employee)

    if (!lineItemID || !employeeID) {
      failedCount += 1
      continue
    }

    const employeeProfile: EmployeeProfile = await req.payload.findByID({
      collection: 'employee-profiles',
      depth: 0,
      id: employeeID,
      overrideAccess: true,
      req,
    })

    const fundAccountID =
      typeof employeeProfile.razorpayFundAccountID === 'string'
        ? employeeProfile.razorpayFundAccountID
        : ''

    const idempotencyKey = buildIdempotencyKey({
      employeeID,
      payrollRunID: runID,
    })

    const netPayable = toNumber(lineItem.netPayable)

    const existingTxn = await req.payload.find({
      collection: 'payroll-payout-transactions',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          {
            payrollRun: {
              equals: runID,
            },
          },
          {
            lineItem: {
              equals: lineItemID,
            },
          },
        ],
      },
    })

    const payoutTxnID = readRelationID(existingTxn.docs[0]?.id)

    if (payoutTxnID) {
      await req.payload.update({
        collection: 'payroll-payout-transactions',
        data: {
          attemptCount: toNumber(existingTxn.docs[0]?.attemptCount, 0) + 1,
          errorMessage: undefined,
          idempotencyKey,
          initiatedAt: new Date().toISOString(),
          payoutStatus: 'created',
        },
        id: payoutTxnID,
        overrideAccess: true,
        req,
      })
    }

    const createdTxn =
      payoutTxnID
        ? null
        : ((await req.payload.create({
            collection: 'payroll-payout-transactions',
            data: {
              attemptCount: 1,
              employee: employeeID,
              idempotencyKey,
              initiatedAt: new Date().toISOString(),
              lineItem: lineItemID,
              payoutStatus: 'created',
              payrollRun: runID,
              provider: 'razorpayx',
            },
            overrideAccess: true,
            req,
          })))

    const payoutTxnTargetID = payoutTxnID || readRelationID(createdTxn?.id)

    try {
      if (!fundAccountID) {
        throw new Error('Employee missing Razorpay fund account ID.')
      }

      if (!isRazorpayXConfigured()) {
        throw new Error('RazorpayX is not configured.')
      }

      const payout = await createRazorpayXPayout({
        amountInPaise: Math.max(0, Math.round(netPayable * 100)),
        fundAccountID,
        idempotencyKey,
        narration: `Salary ${String(run.payrollRunCode || runID)}`,
        referenceID: `${String(run.payrollRunCode || runID)}-${String(employeeID)}`,
      })

      const mappedStatus = mapRazorpayPayoutStatus(payout.status)

      if (payoutTxnTargetID) {
        await req.payload.update({
          collection: 'payroll-payout-transactions',
          data: {
            payoutID: payout.id,
            payoutStatus: mappedStatus,
            responseLog: {
              payout,
            },
            utr: payout.utr,
          },
          id: payoutTxnTargetID,
          overrideAccess: true,
          req,
        })
      }

      await req.payload.update({
        collection: 'payroll-line-items',
        data: {
          status: mappedStatus === 'processed' ? 'processed' : 'processing',
        },
        id: lineItemID,
        overrideAccess: true,
        req,
      })
    } catch (error) {
      failedCount += 1

      if (payoutTxnTargetID) {
        await req.payload.update({
          collection: 'payroll-payout-transactions',
          data: {
            errorMessage: error instanceof Error ? error.message : 'Payout failed.',
            payoutStatus: 'failed',
          },
          id: payoutTxnTargetID,
          overrideAccess: true,
          req,
        })
      }

      await req.payload.update({
        collection: 'payroll-line-items',
        data: {
          status: 'failed',
        },
        id: lineItemID,
        overrideAccess: true,
        req,
      })
    }
  }

  const finalStatus = failedCount > 0 ? 'failed' : 'completed'

  return req.payload.update({
    collection: 'payroll-runs',
    data: {
      disbursedAt: new Date().toISOString(),
      status: finalStatus,
    },
    id: runID,
    overrideAccess: true,
    req,
  })
}

export const reconcilePayrollRunFromPayouts = async ({
  req,
  runID,
}: {
  req: PayloadRequest
  runID: number
}) => {
  const transactions = await req.payload.find({
    collection: 'payroll-payout-transactions',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      payrollRun: {
        equals: runID,
      },
    },
  })

  if (transactions.totalDocs === 0) {
    return
  }

  const statuses = (transactions.docs as PayrollPayoutTransaction[]).map((doc) => String(doc.payoutStatus || 'created'))

  const hasFailed = statuses.some((status) => status === 'failed')
  const allProcessed = statuses.every((status) => status === 'processed')

  if (allProcessed) {
    await req.payload.update({
      collection: 'payroll-runs',
      data: {
        status: 'completed',
      },
      id: runID,
      overrideAccess: true,
      req,
    })
    return
  }

  if (hasFailed) {
    await req.payload.update({
      collection: 'payroll-runs',
      data: {
        status: 'failed',
      },
      id: runID,
      overrideAccess: true,
      req,
    })
  }
}
