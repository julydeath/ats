import type { AttendanceStatus } from '@/lib/constants/hr'
import type { InternalRole } from '@/lib/constants/roles'

export type AttendanceViewMode = 'my' | 'team'

export type AttendanceQueryFiltersInput = {
  employeeId?: string | null
  from?: string | null
  month?: string | null
  to?: string | null
  view?: string | null
}

export type AttendanceQueryFilters = {
  employeeId: number | null
  fromISO: string
  month: string
  toISO: string
  view: AttendanceViewMode
}

export type AttendanceCalendarDay = {
  dateISO: string
  day: number
  inCurrentMonth: boolean
  isToday: boolean
  status: AttendanceStatus | null
}

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return null
}

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const startOfDay = (value: Date): Date => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const endOfDay = (value: Date): Date => {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

const startOfMonth = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), 1)
const endOfMonth = (value: Date): Date => new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999)

const parseMonth = (value: string | null | undefined): Date | null => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return null
  }

  const [yearRaw, monthRaw] = value.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }

  return new Date(year, month - 1, 1)
}

const toMonthValue = (value: Date): string => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

const addDays = (value: Date, days: number): Date => {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

export const normalizeAttendanceQueryFilters = ({
  input,
  role,
  selfEmployeeId,
}: {
  input: AttendanceQueryFiltersInput
  role: InternalRole
  selfEmployeeId: number | null
}): AttendanceQueryFilters => {
  const monthBase = parseMonth(input.month) || new Date()
  const defaultFrom = startOfMonth(monthBase)
  const defaultTo = endOfMonth(monthBase)

  const parsedFrom = parseDate(input.from)
  const parsedTo = parseDate(input.to)

  let from = parsedFrom ? startOfDay(parsedFrom) : defaultFrom
  let to = parsedTo ? endOfDay(parsedTo) : defaultTo

  if (from.getTime() > to.getTime()) {
    from = defaultFrom
    to = defaultTo
  }

  const viewRequested = String(input.view || '').toLowerCase()
  const canUseTeamView = role === 'admin' || role === 'leadRecruiter'
  const view: AttendanceViewMode = canUseTeamView && viewRequested === 'team' ? 'team' : 'my'

  const requestedEmployeeId = parseNumber(input.employeeId)
  const employeeId = view === 'my' ? selfEmployeeId : requestedEmployeeId

  return {
    employeeId,
    fromISO: from.toISOString(),
    month: toMonthValue(monthBase),
    toISO: to.toISOString(),
    view,
  }
}

export const buildAttendanceCalendarDays = ({
  month,
  statusByDate,
}: {
  month: string
  statusByDate: Map<string, AttendanceStatus>
}): AttendanceCalendarDay[] => {
  const monthBase = parseMonth(month) || new Date()
  const monthStart = startOfMonth(monthBase)
  const monthEnd = endOfMonth(monthBase)

  const weekdayStart = (monthStart.getDay() + 6) % 7
  const calendarStart = addDays(monthStart, -weekdayStart)
  const todayISO = startOfDay(new Date()).toISOString().slice(0, 10)

  return Array.from({ length: 42 }, (_, index) => {
    const dayDate = addDays(calendarStart, index)
    const dayISO = dayDate.toISOString().slice(0, 10)

    return {
      dateISO: dayISO,
      day: dayDate.getDate(),
      inCurrentMonth: dayDate >= monthStart && dayDate <= monthEnd,
      isToday: dayISO === todayISO,
      status: statusByDate.get(dayISO) || null,
    }
  })
}
