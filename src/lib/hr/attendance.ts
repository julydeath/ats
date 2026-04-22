import { type PayloadRequest, type Where } from 'payload'

import type { AttendanceStatus } from '@/lib/constants/hr'
import { readRelationID } from '@/lib/hr/common'
import type { AttendanceShift, EmployeeProfile } from '@/payload-types'

const toISODate = (value: Date): string => value.toISOString().slice(0, 10)

const toDateOnly = (value: string | Date): Date => {
  const raw = typeof value === 'string' ? new Date(value) : new Date(value)
  raw.setHours(0, 0, 0, 0)
  return raw
}

const parseHHMM = (value: string | null | undefined): number | null => {
  if (!value) return null
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  const hours = Number(match[1])
  const mins = Number(match[2])

  if (!Number.isFinite(hours) || !Number.isFinite(mins) || hours > 23 || mins > 59) {
    return null
  }

  return hours * 60 + mins
}

const weekdayKey = (date: Date): string => {
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return map[date.getDay()] || 'monday'
}

export const calculateWorkedMinutes = (startISO: string, endISO: string): number => {
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0
  }

  return Math.floor((end - start) / 60000)
}

export const classifyAttendanceFromWorkedMinutes = ({
  fullDayMinutes,
  halfDayMinutes,
  workedMinutes,
}: {
  fullDayMinutes: number
  halfDayMinutes: number
  workedMinutes: number
}): 'present' | 'halfDay' | 'absent' => {
  const normalizedWorked = Math.max(0, workedMinutes)
  if (normalizedWorked >= fullDayMinutes) {
    return 'present'
  }

  if (normalizedWorked >= halfDayMinutes || normalizedWorked > 0) {
    return 'halfDay'
  }

  return 'absent'
}

const findEmployeeProfile = async (req: PayloadRequest, employeeID: number): Promise<EmployeeProfile> => {
  return req.payload.findByID({
    collection: 'employee-profiles',
    depth: 1,
    id: employeeID,
    overrideAccess: true,
    req,
  })
}

const findHolidayOnDate = async ({
  date,
  holidayCalendar,
  req,
}: {
  date: Date
  holidayCalendar: unknown
  req: PayloadRequest
}): Promise<{ isHoliday: boolean; name: string | null }> => {
  const calendarID = readRelationID(holidayCalendar)
  if (!calendarID) {
    return { isHoliday: false, name: null }
  }

  const calendar = await req.payload.findByID({
    collection: 'holiday-calendars',
    depth: 0,
    id: calendarID,
    overrideAccess: true,
    req,
  })

  const target = toISODate(date)
  const holidays = Array.isArray(calendar.holidays) ? calendar.holidays : []

  const match = holidays.find((holiday) => {
    if (!holiday || typeof holiday !== 'object') {
      return false
    }

    const typedHoliday = holiday as { date?: string }
    if (!typedHoliday.date) {
      return false
    }

    return toISODate(new Date(typedHoliday.date)) === target
  }) as { name?: string } | undefined

  return {
    isHoliday: Boolean(match),
    name: match?.name || null,
  }
}

const findApprovedLeaveOnDate = async ({
  date,
  employeeID,
  req,
}: {
  date: Date
  employeeID: number
  req: PayloadRequest
}) => {
  const startOfDay = toDateOnly(date).toISOString()
  const endOfDay = new Date(toDateOnly(date))
  endOfDay.setHours(23, 59, 59, 999)

  const where: Where = {
    and: [
      {
        employee: {
          equals: employeeID,
        },
      },
      {
        status: {
          equals: 'approved',
        },
      },
      {
        startDate: {
          less_than_equal: endOfDay.toISOString(),
        },
      },
      {
        endDate: {
          greater_than_equal: startOfDay,
        },
      },
    ],
  }

  const result = await req.payload.find({
    collection: 'leave-requests',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where,
  })

  return result.docs[0] || null
}

type AttendanceComputation = {
  attendanceStatus: AttendanceStatus
  holidayName: string | null
  lateMinutes: number
  lop: boolean
  overtimeMinutes: number
  workedMinutes: number
}

type AttendanceProfileInput = {
  weeklyOffDays?: string[] | null
  shiftStartTime?: string | null
  graceMinutes?: number | null
  halfDayThresholdMinutes?: number | null
  fullDayThresholdMinutes?: number | null
  overtimeThresholdMinutes?: number | null
  lastPunchInAt?: string | null
}

const computeAttendance = ({
  date,
  holidayName,
  isHoliday,
  leaveRequest,
  profile,
  workedMinutes,
}: {
  date: Date
  holidayName: string | null
  isHoliday: boolean
  leaveRequest: unknown
  profile: AttendanceProfileInput
  workedMinutes: number
}): AttendanceComputation => {
  const weeklyOffDays = Array.isArray(profile.weeklyOffDays)
    ? (profile.weeklyOffDays.filter((value) => typeof value === 'string') as string[])
    : []

  const currentWeekday = weekdayKey(date)
  const isWeekOff = weeklyOffDays.includes(currentWeekday)

  if (leaveRequest && typeof leaveRequest === 'object') {
    const typedLeave = leaveRequest as { leaveType?: unknown }
    const leaveType = typedLeave.leaveType && typeof typedLeave.leaveType === 'object'
      ? (typedLeave.leaveType as { paid?: boolean })
      : null

    return {
      attendanceStatus: 'leave',
      holidayName: null,
      lateMinutes: 0,
      lop: leaveType?.paid === false,
      overtimeMinutes: 0,
      workedMinutes,
    }
  }

  if (isHoliday) {
    return {
      attendanceStatus: 'holiday',
      holidayName,
      lateMinutes: 0,
      lop: false,
      overtimeMinutes: 0,
      workedMinutes,
    }
  }

  if (isWeekOff) {
    return {
      attendanceStatus: 'weekOff',
      holidayName: null,
      lateMinutes: 0,
      lop: false,
      overtimeMinutes: 0,
      workedMinutes,
    }
  }

  const shiftStart = parseHHMM(typeof profile.shiftStartTime === 'string' ? profile.shiftStartTime : null)
  const graceMinutes = typeof profile.graceMinutes === 'number' ? profile.graceMinutes : 0
  const halfDayMinutes = typeof profile.halfDayThresholdMinutes === 'number' ? profile.halfDayThresholdMinutes : 240
  const fullDayMinutes = typeof profile.fullDayThresholdMinutes === 'number' ? profile.fullDayThresholdMinutes : 480
  const overtimeThresholdMinutes =
    typeof profile.overtimeThresholdMinutes === 'number' ? profile.overtimeThresholdMinutes : 540

  let lateMinutes = 0
  if (shiftStart !== null && typeof profile.lastPunchInAt === 'string') {
    const inDate = new Date(profile.lastPunchInAt)
    if (!Number.isNaN(inDate.getTime())) {
      const inMinutes = inDate.getHours() * 60 + inDate.getMinutes()
      lateMinutes = Math.max(0, inMinutes - (shiftStart + graceMinutes))
    }
  }

  const overtimeMinutes = Math.max(0, workedMinutes - overtimeThresholdMinutes)

  if (workedMinutes >= fullDayMinutes) {
    return {
      attendanceStatus: 'present',
      holidayName: null,
      lateMinutes,
      lop: false,
      overtimeMinutes,
      workedMinutes,
    }
  }

  if (workedMinutes >= halfDayMinutes) {
    return {
      attendanceStatus: 'halfDay',
      holidayName: null,
      lateMinutes,
      lop: true,
      overtimeMinutes,
      workedMinutes,
    }
  }

  return {
    attendanceStatus: classifyAttendanceFromWorkedMinutes({
      fullDayMinutes,
      halfDayMinutes,
      workedMinutes,
    }),
    holidayName: null,
    lateMinutes,
    lop: true,
    overtimeMinutes,
    workedMinutes,
  }
}

const findExistingSummary = async ({
  date,
  employeeID,
  req,
}: {
  date: Date
  employeeID: number
  req: PayloadRequest
}) => {
  return req.payload.find({
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
            equals: toDateOnly(date).toISOString(),
          },
        },
      ],
    },
  })
}

export const updateAttendanceDailySummaryFromLog = async ({
  attendanceLog,
  req,
}: {
  attendanceLog: Record<string, unknown>
  req: PayloadRequest
}): Promise<void> => {
  const employeeID = readRelationID(attendanceLog.employee)
  if (!employeeID) {
    return
  }

  const punchInAt = typeof attendanceLog.punchInAt === 'string' ? attendanceLog.punchInAt : null
  const punchOutAt = typeof attendanceLog.punchOutAt === 'string' ? attendanceLog.punchOutAt : null
  const baseDate = punchInAt || (typeof attendanceLog.punchDate === 'string' ? attendanceLog.punchDate : null)

  if (!baseDate) {
    return
  }

  const attendanceDate = toDateOnly(baseDate)
  const profile = await findEmployeeProfile(req, employeeID)

  let shiftStartTime: string | null = null
  let graceMinutes = 0
  let halfDayThresholdMinutes = 240
  let fullDayThresholdMinutes = 480
  let overtimeThresholdMinutes = 540

  const shiftID = readRelationID(profile.attendanceShift)
  if (shiftID) {
    const shiftDoc: AttendanceShift = await req.payload.findByID({
      collection: 'attendance-shifts',
      depth: 0,
      id: shiftID,
      overrideAccess: true,
      req,
    })

    shiftStartTime = typeof shiftDoc.shiftStartTime === 'string' ? shiftDoc.shiftStartTime : null
    graceMinutes = typeof shiftDoc.graceMinutes === 'number' ? shiftDoc.graceMinutes : graceMinutes
    halfDayThresholdMinutes =
      typeof shiftDoc.halfDayThresholdMinutes === 'number' ? shiftDoc.halfDayThresholdMinutes : halfDayThresholdMinutes
    fullDayThresholdMinutes =
      typeof shiftDoc.fullDayThresholdMinutes === 'number' ? shiftDoc.fullDayThresholdMinutes : fullDayThresholdMinutes
    overtimeThresholdMinutes =
      typeof shiftDoc.overtimeThresholdMinutes === 'number'
        ? shiftDoc.overtimeThresholdMinutes
        : overtimeThresholdMinutes
  }

  const { isHoliday, name } = await findHolidayOnDate({
    date: attendanceDate,
    holidayCalendar: profile.holidayCalendar,
    req,
  })

  const leaveRequest = await findApprovedLeaveOnDate({
    date: attendanceDate,
    employeeID,
    req,
  })

  const workedMinutes = punchInAt && punchOutAt ? calculateWorkedMinutes(punchInAt, punchOutAt) : 0

  const computation = computeAttendance({
    date: attendanceDate,
    holidayName: name,
    isHoliday,
    leaveRequest,
    profile: {
      ...profile,
      fullDayThresholdMinutes,
      graceMinutes,
      halfDayThresholdMinutes,
      lastPunchInAt: punchInAt,
      overtimeThresholdMinutes,
      shiftStartTime,
    },
    workedMinutes,
  })

  const summaryResult = await findExistingSummary({
    date: attendanceDate,
    employeeID,
    req,
  })

  const payloadData = {
    attendanceLog: readRelationID(attendanceLog.id) || undefined,
    date: attendanceDate.toISOString(),
    employee: employeeID,
    holidayName: computation.holidayName || undefined,
    lateMinutes: computation.lateMinutes,
    leaveRequest: readRelationID(leaveRequest?.id) || undefined,
    lop: computation.lop,
    overtimeMinutes: computation.overtimeMinutes,
    status: computation.attendanceStatus,
    workedMinutes: computation.workedMinutes,
  }

  if (summaryResult.docs[0]?.id) {
    await req.payload.update({
      collection: 'attendance-daily-summaries',
      data: payloadData,
      id: summaryResult.docs[0].id,
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

export const getOpenAttendanceSession = async ({
  employeeID,
  req,
}: {
  employeeID: number
  req: PayloadRequest
}) => {
  const result = await req.payload.find({
    collection: 'attendance-logs',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    sort: '-punchInAt',
    where: {
      and: [
        {
          employee: {
            equals: employeeID,
          },
        },
        {
          punchOutAt: {
            exists: false,
          },
        },
      ],
    },
  })

  return result.docs[0] || null
}
