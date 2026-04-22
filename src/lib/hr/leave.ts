import { APIError, type PayloadRequest } from 'payload'

import type { LeaveTypeKey } from '@/lib/constants/hr'
import { LEAVE_TYPE_KEY_LABELS } from '@/lib/constants/hr'
import { readRelationID } from '@/lib/hr/common'
import type { LeaveRequest, LeaveType } from '@/payload-types'

const DEFAULT_LEAVE_TYPES: Array<{
  accrualPerMonth: number
  annualAllowance: number
  carryForwardLimit: number
  isEncashable: boolean
  key: LeaveTypeKey
  paid: boolean
}> = [
  {
    accrualPerMonth: 1,
    annualAllowance: 12,
    carryForwardLimit: 6,
    isEncashable: false,
    key: 'CL',
    paid: true,
  },
  {
    accrualPerMonth: 1,
    annualAllowance: 12,
    carryForwardLimit: 0,
    isEncashable: false,
    key: 'SL',
    paid: true,
  },
  {
    accrualPerMonth: 1.5,
    annualAllowance: 18,
    carryForwardLimit: 30,
    isEncashable: true,
    key: 'EL',
    paid: true,
  },
]

const toDateOnly = (value: string | Date): Date => {
  const date = typeof value === 'string' ? new Date(value) : new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const eachDateInRange = (start: Date, end: Date): Date[] => {
  const days: Date[] = []
  const cursor = new Date(start)

  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export const ensureDefaultLeaveTypes = async (req: PayloadRequest): Promise<void> => {
  for (const leaveType of DEFAULT_LEAVE_TYPES) {
    const existing = await req.payload.find({
      collection: 'leave-types',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        key: {
          equals: leaveType.key,
        },
      },
    })

    if (existing.totalDocs > 0) {
      continue
    }

    await req.payload.create({
      collection: 'leave-types',
      data: {
        accrualPerMonth: leaveType.accrualPerMonth,
        annualAllowance: leaveType.annualAllowance,
        carryForwardLimit: leaveType.carryForwardLimit,
        isActive: true,
        isEncashable: leaveType.isEncashable,
        key: leaveType.key,
        maxConsecutiveDays: 15,
        minUnit: 'fullDay',
        name: LEAVE_TYPE_KEY_LABELS[leaveType.key],
        paid: leaveType.paid,
      },
      draft: false,
      overrideAccess: true,
      req,
    })
  }
}

export const computeLeaveDays = ({
  endDate,
  leaveUnit,
  startDate,
}: {
  endDate: string | Date
  leaveUnit: 'fullDay' | 'halfDay'
  startDate: string | Date
}): number => {
  const start = toDateOnly(startDate)
  const end = toDateOnly(endDate)

  if (end.getTime() < start.getTime()) {
    throw new APIError('End date cannot be before start date.', 400)
  }

  const diffDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1

  if (leaveUnit === 'halfDay') {
    if (diffDays > 1) {
      throw new APIError('Half-day leave can only be requested for a single day.', 400)
    }

    return 0.5
  }

  return diffDays
}

const upsertLeaveBalance = async ({
  employeeID,
  leaveType,
  req,
  usedDays,
  year,
}: {
  employeeID: number
  leaveType: LeaveType
  req: PayloadRequest
  usedDays: number
  year: number
}) => {
  const leaveTypeID = readRelationID(leaveType.id)
  if (!leaveTypeID) {
    return
  }

  const balanceResult = await req.payload.find({
    collection: 'leave-balances',
    depth: 0,
    limit: 1,
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
          leaveType: {
            equals: leaveTypeID,
          },
        },
        {
          year: {
            equals: year,
          },
        },
      ],
    },
  })

  const accrued = Number(leaveType.accrualPerMonth || 0) * 12
  const openingBalance = Number(leaveType.annualAllowance || 0)

  if (!balanceResult.docs[0]?.id) {
    const used = Math.max(0, usedDays)

    await req.payload.create({
      collection: 'leave-balances',
      data: {
        accrued,
        adjustments: 0,
        closingBalance: openingBalance + accrued - used,
        employee: employeeID,
        leaveType: leaveTypeID,
        openingBalance,
        used,
        year,
      },
      overrideAccess: true,
      req,
    })

    return
  }

  const existing = balanceResult.docs[0] as {
    accrued?: number
    adjustments?: number
    closingBalance?: number
    id: number
    openingBalance?: number
    used?: number
  }

  const opening = Number(existing.openingBalance || openingBalance)
  const existingAccrued = Number(existing.accrued || accrued)
  const adjustments = Number(existing.adjustments || 0)
  const updatedUsed = Number(existing.used || 0) + Math.max(0, usedDays)
  const closingBalance = opening + existingAccrued + adjustments - updatedUsed

  await req.payload.update({
    collection: 'leave-balances',
    data: {
      closingBalance,
      used: updatedUsed,
    },
    id: existing.id,
    overrideAccess: true,
    req,
  })
}

export const applyApprovedLeaveToAttendance = async ({
  leaveRequest,
  req,
}: {
  leaveRequest: LeaveRequest
  req: PayloadRequest
}): Promise<void> => {
  const employeeID = readRelationID(leaveRequest.employee)
  const leaveTypeID = readRelationID(leaveRequest.leaveType)
  const startDate = typeof leaveRequest.startDate === 'string' ? leaveRequest.startDate : null
  const endDate = typeof leaveRequest.endDate === 'string' ? leaveRequest.endDate : null

  if (!employeeID || !leaveTypeID || !startDate || !endDate) {
    return
  }

  const leaveType: LeaveType = await req.payload.findByID({
    collection: 'leave-types',
    depth: 0,
    id: leaveTypeID,
    overrideAccess: true,
    req,
  })

  const paid = leaveType.paid !== false
  const from = toDateOnly(startDate)
  const to = toDateOnly(endDate)

  for (const day of eachDateInRange(from, to)) {
    const existingSummary = await req.payload.find({
      collection: 'attendance-daily-summaries',
      depth: 0,
      limit: 1,
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
            date: {
              equals: day.toISOString(),
            },
          },
        ],
      },
    })

    const payloadData = {
      date: day.toISOString(),
      employee: employeeID,
      leaveRequest: readRelationID(leaveRequest.id) || undefined,
      lop: !paid,
      status: 'leave' as const,
      workedMinutes: 0,
    }

    if (existingSummary.docs[0]?.id) {
      await req.payload.update({
        collection: 'attendance-daily-summaries',
        data: payloadData,
        id: existingSummary.docs[0].id,
        overrideAccess: true,
        req,
      })
    } else {
      await req.payload.create({
        collection: 'attendance-daily-summaries',
        data: payloadData,
        overrideAccess: true,
        req,
      })
    }
  }

  const totalDays = Number(leaveRequest.totalDays || 0)
  await upsertLeaveBalance({
    employeeID,
    leaveType,
    req,
    usedDays: totalDays,
    year: from.getFullYear(),
  })
}
