export const GRAPH_PERIODS = ['day', 'week', 'month', 'custom'] as const

export type GraphPeriod = (typeof GRAPH_PERIODS)[number]

export type GraphDateRangeInput = {
  from?: string | null
  month?: string | null
  period?: string | null
  to?: string | null
}

export type GraphDateRange = {
  from: Date
  fromISO: string
  month: string
  period: GraphPeriod
  to: Date
  toISO: string
}

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const parseMonth = (value?: string | null): Date | null => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null

  const [yearRaw, monthRaw] = value.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }

  return new Date(year, month - 1, 1)
}

const toDateStart = (value: Date): Date => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const toDateEnd = (value: Date): Date => {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

const startOfMonth = (value: Date): Date => new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0)
const endOfMonth = (value: Date): Date => new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999)

const toMonthValue = (value: Date): string => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

const parseGraphPeriod = (value?: string | null): GraphPeriod => {
  if (value === 'day' || value === 'week' || value === 'month' || value === 'custom') {
    return value
  }
  return 'month'
}

export const resolveGraphDateRange = (input: GraphDateRangeInput): GraphDateRange => {
  const period = parseGraphPeriod(input.period)
  const now = new Date()
  const parsedMonth = parseMonth(input.month) || now
  const normalizedMonth = toMonthValue(parsedMonth)
  const parsedFrom = parseDate(input.from)
  const parsedTo = parseDate(input.to)

  let from: Date
  let to: Date

  if (period === 'day') {
    const base = parsedFrom || parsedTo || now
    from = toDateStart(base)
    to = toDateEnd(base)
  } else if (period === 'week') {
    const endBase = parsedTo || now
    to = toDateEnd(endBase)
    from = toDateStart(new Date(to))
    from.setDate(from.getDate() - 6)
  } else if (period === 'custom') {
    const fallbackFrom = startOfMonth(parsedMonth)
    const fallbackTo = endOfMonth(parsedMonth)
    from = parsedFrom ? toDateStart(parsedFrom) : fallbackFrom
    to = parsedTo ? toDateEnd(parsedTo) : fallbackTo
    if (from.getTime() > to.getTime()) {
      from = fallbackFrom
      to = fallbackTo
    }
  } else {
    from = startOfMonth(parsedMonth)
    to = endOfMonth(parsedMonth)
  }

  return {
    from,
    fromISO: from.toISOString(),
    month: normalizedMonth,
    period,
    to,
    toISO: to.toISOString(),
  }
}

export const isDateInGraphRange = ({
  dateValue,
  range,
}: {
  dateValue?: string | null
  range: GraphDateRange
}): boolean => {
  if (!dateValue) return false
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.getTime() >= range.from.getTime() && parsed.getTime() <= range.to.getTime()
}

export const toDateInputValue = (value: Date | string): string => {
  const parsed = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0')
  const day = `${parsed.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}
