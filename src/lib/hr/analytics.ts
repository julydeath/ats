import type { Payload, Where } from 'payload'

import type { InternalSessionUser } from '@/lib/auth/internal-auth'
import { LEAVE_TYPE_KEY_LABELS } from '@/lib/constants/hr'
import { isInternalRole, type InternalRole } from '@/lib/constants/roles'
import type {
  Application,
  ApplicationStageHistory,
  AttendanceDailySummary,
  Client,
  Interview,
  LeaveRequest,
  PayrollLineItem,
  PayrollPayoutTransaction,
  Placement,
} from '@/payload-types'
import { readRelationID } from '@/lib/hr/common'

const DEFAULT_RANGE_DAYS = 30
const MAX_RANGE_DAYS = 180

type AnalyticsRoleFilter = InternalRole | 'all'

export type HRAnalyticsFiltersInput = {
  employeeId?: number | string | null
  from?: string | null
  role?: string | null
  state?: string | null
  to?: string | null
}

export type HRAnalyticsFilters = {
  employeeId: number | null
  fromISO: string
  role: AnalyticsRoleFilter
  spanDays: number
  state: string | null
  toISO: string
}

type EmployeeSelector = {
  id: number
  label: string
  role: InternalRole
  state: string
}

type EmployeeScoreRow = {
  applicationsAdded: number
  attendancePct: number
  employeeCode: string
  employeeId: number
  interviewsScheduled: number
  jobsCreated: number
  leaveDays: number
  lopDays: number
  managedClients: number
  name: string
  placementsClosed: number
  role: InternalRole
  score: number
  stageMoves: number
  state: string
}

type DayPoint = {
  absent: number
  applications: number
  dateISO: string
  halfDay: number
  interviews: number
  label: string
  leave: number
  lop: number
  placements: number
  present: number
}

type LeaveBreakdownPoint = {
  days: number
  key: string
  label: string
  requests: number
}

type PayrollTrendPoint = {
  gross: number
  label: string
  net: number
}

type PayrollTrendAccumulator = PayrollTrendPoint & {
  monthKey: string
}

export type HRAnalyticsSummary = {
  employeeRows: EmployeeScoreRow[]
  employeeSelectors: EmployeeSelector[]
  filters: HRAnalyticsFilters
  kpis: {
    approvedLeaveDays: number
    attendanceCompliancePct: number
    avgPerformanceScore: number
    interviewsScheduled: number
    jobsCreated: number
    lopDays: number
    payrollGross: number
    payrollNet: number
    payoutSuccessPct: number
    sourcedApplications: number
    stageMoves: number
    totalActiveClients: number
    workforce: number
  }
  leaveBreakdown: LeaveBreakdownPoint[]
  payrollTrend: PayrollTrendPoint[]
  trend: DayPoint[]
}

const formatDayLabel = (value: string): string =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })

const formatMonthLabel = (value: string): string =>
  new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
  })

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const round = (value: number): number => Math.round(value * 100) / 100

const normalizeDateStart = (value: Date): Date => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const normalizeDateEnd = (value: Date): Date => {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

const toRoleFilter = (value: string | null | undefined): AnalyticsRoleFilter => {
  if (!value || value === 'all') return 'all'
  return isInternalRole(value) ? value : 'all'
}

const toEmployeeID = (value: number | string | null | undefined): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return null
}

const buildDayKeys = (from: Date, to: Date): string[] => {
  const result: string[] = []
  const cursor = normalizeDateStart(from)
  const end = normalizeDateStart(to)

  while (cursor.getTime() <= end.getTime()) {
    result.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}

const buildWhereAnd = (conditions: Where[]): Where =>
  conditions.length <= 1 ? conditions[0] || {} : { and: conditions }

const getDateKey = (value: string | null | undefined): string | null => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

type MutableEmployeeScore = {
  applicationsAdded: number
  attendanceEquivalentDays: number
  employeeCode: string
  employeeId: number
  interviewsScheduled: number
  jobsCreated: number
  leaveDays: number
  lopDays: number
  managedClients: number
  name: string
  placementsClosed: number
  role: InternalRole
  stageMoves: number
  state: string
  workingDays: number
}

const toEmployeeRow = (value: MutableEmployeeScore): EmployeeScoreRow => {
  const attendancePct = value.workingDays > 0 ? round((value.attendanceEquivalentDays / value.workingDays) * 100) : 0

  const baseScore =
    value.jobsCreated * 5 +
    value.applicationsAdded * 1.4 +
    value.stageMoves * 1 +
    value.interviewsScheduled * 2 +
    value.placementsClosed * 10 +
    value.managedClients * 2 +
    (attendancePct / 100) * 35 -
    value.lopDays * 2 -
    Math.max(0, value.leaveDays - 2) * 0.5

  return {
    applicationsAdded: value.applicationsAdded,
    attendancePct,
    employeeCode: value.employeeCode,
    employeeId: value.employeeId,
    interviewsScheduled: value.interviewsScheduled,
    jobsCreated: value.jobsCreated,
    leaveDays: round(value.leaveDays),
    lopDays: value.lopDays,
    managedClients: value.managedClients,
    name: value.name,
    placementsClosed: value.placementsClosed,
    role: value.role,
    score: round(clamp(baseScore, 0, 100)),
    stageMoves: value.stageMoves,
    state: value.state,
  }
}

export const normalizeHRAnalyticsFilters = (
  input: HRAnalyticsFiltersInput,
): HRAnalyticsFilters => {
  const now = new Date()
  const requestedTo = parseDate(input.to)
  const to = normalizeDateEnd(requestedTo || now)
  const requestedFrom = parseDate(input.from)

  const fallbackFrom = new Date(to)
  fallbackFrom.setDate(fallbackFrom.getDate() - (DEFAULT_RANGE_DAYS - 1))

  let from = normalizeDateStart(requestedFrom || fallbackFrom)
  if (from.getTime() > to.getTime()) {
    from = normalizeDateStart(fallbackFrom)
  }

  const rawSpan = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1
  const spanDays = clamp(rawSpan, 1, MAX_RANGE_DAYS)

  if (rawSpan > MAX_RANGE_DAYS) {
    from = normalizeDateStart(new Date(to.getTime() - (MAX_RANGE_DAYS - 1) * 24 * 60 * 60 * 1000))
  }

  const role = toRoleFilter(input.role)
  const employeeId = toEmployeeID(input.employeeId)
  const state = input.state && input.state.trim().length > 0 ? input.state.trim() : null

  return {
    employeeId,
    fromISO: from.toISOString(),
    role,
    spanDays,
    state,
    toISO: to.toISOString(),
  }
}

export const getHRAnalyticsSummary = async ({
  filters,
  payload,
  user,
}: {
  filters: HRAnalyticsFilters
  payload: Payload
  user: InternalSessionUser
}): Promise<HRAnalyticsSummary> => {
  const employeeWhereConditions: Where[] = [
    {
      employmentStatus: {
        equals: 'active',
      },
    },
  ]

  if (filters.state) {
    employeeWhereConditions.push({
      workState: {
        equals: filters.state,
      },
    })
  }

  const employeeResult = await payload.find({
    collection: 'employee-profiles',
    depth: 1,
    limit: 300,
    overrideAccess: false,
    user,
    where: buildWhereAnd(employeeWhereConditions),
  })

  const employeeContexts = employeeResult.docs
    .map((employee): (MutableEmployeeScore & { userId: number }) | null => {
      const userId = readRelationID(employee.user)
      const linkedUser = typeof employee.user === 'object' && employee.user !== null ? employee.user : null
      const role = linkedUser?.role

      if (!userId || !role || !isInternalRole(role)) return null
      if (filters.role !== 'all' && filters.role !== role) return null

      return {
        applicationsAdded: 0,
        attendanceEquivalentDays: 0,
        employeeCode: employee.employeeCode || `EMP-${employee.id}`,
        employeeId: employee.id,
        interviewsScheduled: 0,
        jobsCreated: 0,
        leaveDays: 0,
        lopDays: 0,
        managedClients: 0,
        name: linkedUser.fullName || linkedUser.email || `User ${linkedUser.id}`,
        placementsClosed: 0,
        role,
        stageMoves: 0,
        state: employee.workState || 'Unknown',
        userId,
        workingDays: 0,
      }
    })
    .filter((item): item is MutableEmployeeScore & { userId: number } => Boolean(item))

  const employeeSelectors: EmployeeSelector[] = employeeContexts.map((item) => ({
    id: item.employeeId,
    label: `${item.employeeCode} · ${item.name}`,
    role: item.role,
    state: item.state,
  }))

  const filteredContexts = filters.employeeId
    ? employeeContexts.filter((item) => item.employeeId === filters.employeeId)
    : employeeContexts

  if (filteredContexts.length === 0) {
    return {
      employeeRows: [],
      employeeSelectors: employeeSelectors.sort((a, b) => a.label.localeCompare(b.label)),
      filters,
      kpis: {
        approvedLeaveDays: 0,
        attendanceCompliancePct: 0,
        avgPerformanceScore: 0,
        interviewsScheduled: 0,
        jobsCreated: 0,
        lopDays: 0,
        payrollGross: 0,
        payrollNet: 0,
        payoutSuccessPct: 0,
        sourcedApplications: 0,
        stageMoves: 0,
        totalActiveClients: 0,
        workforce: 0,
      },
      leaveBreakdown: [],
      payrollTrend: [],
      trend: [],
    }
  }

  const employeeIDs = filteredContexts.map((item) => item.employeeId)
  const userIDs = filteredContexts.map((item) => item.userId)
  const employeeByID = new Map<number, MutableEmployeeScore>(filteredContexts.map((item) => [item.employeeId, item]))
  const employeeIDByUserID = new Map<number, number>(filteredContexts.map((item) => [item.userId, item.employeeId]))
  const fromISO = filters.fromISO
  const toISO = filters.toISO

  const [
    attendanceSummaries,
    leaveRequests,
    jobs,
    applications,
    stageHistory,
    interviews,
    placements,
    activeClients,
    payrollLineItems,
    payoutTransactions,
  ] = await Promise.all([
    payload.find({
      collection: 'attendance-daily-summaries',
      depth: 0,
      limit: 3000,
      overrideAccess: false,
      user,
      where: buildWhereAnd([
        { employee: { in: employeeIDs } },
        { date: { greater_than_equal: fromISO } },
        { date: { less_than_equal: toISO } },
      ]),
    }),
    payload.find({
      collection: 'leave-requests',
      depth: 1,
      limit: 2000,
      overrideAccess: false,
      user,
      where: buildWhereAnd([
        { employee: { in: employeeIDs } },
        { startDate: { less_than_equal: toISO } },
        { endDate: { greater_than_equal: fromISO } },
      ]),
    }),
    payload.find({
      collection: 'jobs',
      depth: 0,
      limit: 1200,
      overrideAccess: false,
      user,
      where: buildWhereAnd([
        { createdBy: { in: userIDs } },
        { createdAt: { greater_than_equal: fromISO } },
        { createdAt: { less_than_equal: toISO } },
      ]),
    }),
    payload.find({
      collection: 'applications',
      depth: 0,
      limit: 3000,
      overrideAccess: false,
      user,
      where: buildWhereAnd([
        { recruiter: { in: userIDs } },
        { createdAt: { greater_than_equal: fromISO } },
        { createdAt: { less_than_equal: toISO } },
      ]),
    }),
    payload.find({
      collection: 'application-stage-history',
      depth: 0,
      limit: 5000,
      overrideAccess: false,
      user,
      where: buildWhereAnd([
        { actor: { in: userIDs } },
        { changedAt: { greater_than_equal: fromISO } },
        { changedAt: { less_than_equal: toISO } },
      ]),
    }),
    payload.find({
      collection: 'interviews',
      depth: 0,
      limit: 2500,
      overrideAccess: false,
      user,
      where: buildWhereAnd([
        { recruiter: { in: userIDs } },
        { startTime: { greater_than_equal: fromISO } },
        { startTime: { less_than_equal: toISO } },
      ]),
    }),
    payload.find({
      collection: 'placements',
      depth: 0,
      limit: 1200,
      overrideAccess: false,
      user,
      where: buildWhereAnd([
        { recruiter: { in: userIDs } },
        { createdAt: { greater_than_equal: fromISO } },
        { createdAt: { less_than_equal: toISO } },
      ]),
    }),
    payload.find({
      collection: 'clients',
      depth: 0,
      limit: 1200,
      overrideAccess: false,
      user,
      where: buildWhereAnd([
        { status: { equals: 'active' } },
        {
          or: [
            { owningHeadRecruiter: { in: userIDs } },
            { clientLead: { in: userIDs } },
            { primaryOwner: { in: userIDs } },
            { ownership: { in: userIDs } },
          ],
        },
      ]),
    }),
    payload.find({
      collection: 'payroll-line-items',
      depth: 0,
      limit: 2000,
      overrideAccess: false,
      user,
      where: buildWhereAnd([
        { employee: { in: employeeIDs } },
        { createdAt: { greater_than_equal: fromISO } },
        { createdAt: { less_than_equal: toISO } },
      ]),
    }),
    payload.find({
      collection: 'payroll-payout-transactions',
      depth: 0,
      limit: 2000,
      overrideAccess: false,
      user,
      where: buildWhereAnd([
        { employee: { in: employeeIDs } },
        { initiatedAt: { greater_than_equal: fromISO } },
        { initiatedAt: { less_than_equal: toISO } },
      ]),
    }),
  ])

  const dayKeys = buildDayKeys(new Date(fromISO), new Date(toISO))
  const trendMap = new Map<string, DayPoint>()
  dayKeys.forEach((key) => {
    trendMap.set(key, {
      absent: 0,
      applications: 0,
      dateISO: key,
      halfDay: 0,
      interviews: 0,
      label: formatDayLabel(key),
      leave: 0,
      lop: 0,
      placements: 0,
      present: 0,
    })
  })

  ;(attendanceSummaries.docs as AttendanceDailySummary[]).forEach((row) => {
    const employeeID = readRelationID(row.employee)
    const dateKey = getDateKey(row.date)
    if (!employeeID || !dateKey) return

    const employee = employeeByID.get(employeeID)
    const day = trendMap.get(dateKey)
    if (!employee || !day) return

    if (row.status !== 'holiday' && row.status !== 'weekOff') {
      employee.workingDays += 1
      if (row.status === 'present') employee.attendanceEquivalentDays += 1
      if (row.status === 'halfDay') employee.attendanceEquivalentDays += 0.5
    }

    if (row.lop) {
      employee.lopDays += 1
      day.lop += 1
    }

    if (row.status === 'present') day.present += 1
    if (row.status === 'leave') day.leave += 1
    if (row.status === 'halfDay') day.halfDay += 1
    if (row.status === 'absent') day.absent += 1
  })

  const leaveTypeMap = new Map<string, LeaveBreakdownPoint>()
  let approvedLeaveDays = 0

  ;(leaveRequests.docs as LeaveRequest[]).forEach((row) => {
    const employeeID = readRelationID(row.employee)
    if (!employeeID) return
    const employee = employeeByID.get(employeeID)
    if (!employee) return

    if (row.status === 'approved') {
      const leaveDays = toNumber(row.totalDays)
      employee.leaveDays += leaveDays
      approvedLeaveDays += leaveDays
    }

    const leaveTypeKey =
      typeof row.leaveType === 'object' && row.leaveType !== null
        ? row.leaveType.key
        : 'OTHER'
    const key = String(leaveTypeKey || 'OTHER')
    const label = key in LEAVE_TYPE_KEY_LABELS
      ? LEAVE_TYPE_KEY_LABELS[key as keyof typeof LEAVE_TYPE_KEY_LABELS]
      : key
    const existing = leaveTypeMap.get(key)
    const addDays = row.status === 'approved' ? toNumber(row.totalDays) : 0

    if (existing) {
      existing.requests += 1
      existing.days += addDays
      return
    }

    leaveTypeMap.set(key, {
      days: addDays,
      key,
      label,
      requests: 1,
    })
  })

  ;(jobs.docs as Array<{ createdAt: string; createdBy?: Application['createdBy'] }>).forEach((row) => {
    const userID = readRelationID(row.createdBy)
    if (!userID) return
    const employeeID = employeeIDByUserID.get(userID)
    if (!employeeID) return
    const employee = employeeByID.get(employeeID)
    if (!employee) return
    employee.jobsCreated += 1
  })

  ;(applications.docs as Application[]).forEach((row) => {
    const userID = readRelationID(row.recruiter)
    if (!userID) return
    const employeeID = employeeIDByUserID.get(userID)
    if (!employeeID) return
    const employee = employeeByID.get(employeeID)
    if (!employee) return

    employee.applicationsAdded += 1
    const key = getDateKey(row.createdAt)
    const day = key ? trendMap.get(key) : null
    if (day) {
      day.applications += 1
    }
  })

  ;(stageHistory.docs as ApplicationStageHistory[]).forEach((row) => {
    const userID = readRelationID(row.actor)
    if (!userID) return
    const employeeID = employeeIDByUserID.get(userID)
    if (!employeeID) return
    const employee = employeeByID.get(employeeID)
    if (!employee) return
    employee.stageMoves += 1
  })

  ;(interviews.docs as Interview[]).forEach((row) => {
    const userID = readRelationID(row.recruiter)
    if (!userID) return
    const employeeID = employeeIDByUserID.get(userID)
    if (!employeeID) return
    const employee = employeeByID.get(employeeID)
    if (!employee) return

    employee.interviewsScheduled += 1
    const key = getDateKey(row.startTime)
    const day = key ? trendMap.get(key) : null
    if (day) {
      day.interviews += 1
    }
  })

  ;(placements.docs as Placement[]).forEach((row) => {
    const userID = readRelationID(row.recruiter)
    if (!userID) return
    const employeeID = employeeIDByUserID.get(userID)
    if (!employeeID) return
    const employee = employeeByID.get(employeeID)
    if (!employee) return

    if (row.status === 'active' || row.status === 'completed') {
      employee.placementsClosed += 1
    }

    const key = getDateKey(row.createdAt)
    const day = key ? trendMap.get(key) : null
    if (day) {
      day.placements += 1
    }
  })

  const clientOwnershipSet = new Set<string>()
  ;(activeClients.docs as Client[]).forEach((client) => {
    const relatedUsers = [
      readRelationID(client.owningHeadRecruiter),
      readRelationID(client.clientLead),
      readRelationID(client.primaryOwner),
      readRelationID(client.ownership),
    ].filter((value): value is number => Boolean(value))

    relatedUsers.forEach((userID) => {
      const employeeID = employeeIDByUserID.get(userID)
      if (!employeeID) return

      const key = `${employeeID}:${client.id}`
      if (clientOwnershipSet.has(key)) return
      clientOwnershipSet.add(key)

      const employee = employeeByID.get(employeeID)
      if (employee) {
        employee.managedClients += 1
      }
    })
  })

  let payrollGross = 0
  let payrollNet = 0
  const payrollTrendMap = new Map<string, PayrollTrendAccumulator>()

  ;(payrollLineItems.docs as PayrollLineItem[]).forEach((item) => {
    payrollGross += toNumber(item.grossEarnings)
    payrollNet += toNumber(item.netPayable)

    const monthKey = item.createdAt.slice(0, 7)
    const existing = payrollTrendMap.get(monthKey)
    if (existing) {
      existing.gross += toNumber(item.grossEarnings)
      existing.net += toNumber(item.netPayable)
      return
    }

    payrollTrendMap.set(monthKey, {
      gross: toNumber(item.grossEarnings),
      label: formatMonthLabel(item.createdAt),
      monthKey,
      net: toNumber(item.netPayable),
    })
  })

  const payoutDocs = payoutTransactions.docs as PayrollPayoutTransaction[]
  const processedPayouts = payoutDocs.filter((item) => item.payoutStatus === 'processed').length
  const payoutSuccessPct = payoutDocs.length > 0 ? round((processedPayouts / payoutDocs.length) * 100) : 0

  const employeeRows = Array.from(employeeByID.values())
    .map(toEmployeeRow)
    .sort((a, b) => b.score - a.score)

  const avgPerformanceScore =
    employeeRows.length > 0
      ? round(employeeRows.reduce((sum, row) => sum + row.score, 0) / employeeRows.length)
      : 0
  const attendanceCompliancePct =
    employeeRows.length > 0
      ? round(employeeRows.reduce((sum, row) => sum + row.attendancePct, 0) / employeeRows.length)
      : 0

  const jobsCreated = employeeRows.reduce((sum, row) => sum + row.jobsCreated, 0)
  const sourcedApplications = employeeRows.reduce((sum, row) => sum + row.applicationsAdded, 0)
  const interviewsScheduled = employeeRows.reduce((sum, row) => sum + row.interviewsScheduled, 0)
  const placementsClosed = employeeRows.reduce((sum, row) => sum + row.placementsClosed, 0)
  const stageMoves = employeeRows.reduce((sum, row) => sum + row.stageMoves, 0)
  const lopDays = employeeRows.reduce((sum, row) => sum + row.lopDays, 0)
  const totalActiveClients = clientOwnershipSet.size > 0 ? activeClients.totalDocs : 0

  return {
    employeeRows,
    employeeSelectors: employeeSelectors.sort((a, b) => a.label.localeCompare(b.label)),
    filters,
    kpis: {
      approvedLeaveDays: round(approvedLeaveDays),
      attendanceCompliancePct,
      avgPerformanceScore,
      interviewsScheduled,
      jobsCreated,
      lopDays,
      payrollGross: round(payrollGross),
      payrollNet: round(payrollNet),
      payoutSuccessPct,
      sourcedApplications,
      stageMoves,
      totalActiveClients,
      workforce: employeeRows.length,
    },
    leaveBreakdown: Array.from(leaveTypeMap.values()).sort((a, b) => b.days - a.days),
    payrollTrend: Array.from(payrollTrendMap.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(({ monthKey: _monthKey, ...point }) => point),
    trend: Array.from(trendMap.values()),
  }
}
