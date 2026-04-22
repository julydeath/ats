import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { attendanceLogManageAccess, attendanceLogReadAccess } from '@/access/hr'
import { ATTENDANCE_SOURCE_OPTIONS } from '@/lib/constants/hr'
import { updateAttendanceDailySummaryFromLog } from '@/lib/hr/attendance'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

const readDateOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

const minutesBetween = (startISO: string, endISO: string): number => {
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0
  }

  return Math.floor((end - start) / 60000)
}

export const AttendanceLogs: CollectionConfig = {
  slug: 'attendance-logs',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: attendanceLogManageAccess,
    read: attendanceLogReadAccess,
    update: attendanceLogManageAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['attendanceLogCode', 'employee', 'punchDate', 'punchInAt', 'punchOutAt', 'workedMinutes'],
    group: 'HRMS',
    useAsTitle: 'attendanceLogCode',
  },
  fields: [
    {
      name: 'attendanceLogCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'employee',
      type: 'relationship',
      relationTo: 'employee-profiles',
      required: true,
      index: true,
    },
    {
      name: 'punchDate',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'punchInAt',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'punchOutAt',
      type: 'date',
      index: true,
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'web',
      options: ATTENDANCE_SOURCE_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'ipAddress',
      type: 'text',
    },
    {
      name: 'deviceInfo',
      type: 'text',
    },
    {
      name: 'geoLatitude',
      type: 'number',
    },
    {
      name: 'geoLongitude',
      type: 'number',
    },
    {
      name: 'tamperFlags',
      type: 'text',
      hasMany: true,
    },
    {
      name: 'workedMinutes',
      type: 'number',
      min: 0,
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const attendanceLogCode = await resolveBusinessCode({
          collection: 'attendance-logs',
          data: typedData,
          fieldName: 'attendanceLogCode',
          originalDoc: typedOriginal,
          prefix: 'ATN',
          req,
        })

        return {
          ...typedData,
          attendanceLogCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, originalDoc }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const punchInAt = readDateOrNull(typedData.punchInAt ?? typedOriginal?.punchInAt)
        const punchOutAt = readDateOrNull(typedData.punchOutAt ?? typedOriginal?.punchOutAt)

        if (!punchInAt) {
          throw new APIError('Punch-in time is required.', 400)
        }

        if (punchOutAt && new Date(punchOutAt).getTime() < new Date(punchInAt).getTime()) {
          throw new APIError('Punch-out time cannot be earlier than punch-in.', 400)
        }

        const punchDate = new Date(punchInAt)
        punchDate.setHours(0, 0, 0, 0)

        return {
          ...typedData,
          punchDate: typedData.punchDate || punchDate.toISOString(),
          punchInAt,
          punchOutAt: punchOutAt || undefined,
          workedMinutes: punchOutAt ? minutesBetween(punchInAt, punchOutAt) : 0,
        }
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        await updateAttendanceDailySummaryFromLog({
          attendanceLog: doc as Record<string, unknown>,
          req,
        })

        return doc
      },
    ],
  },
  indexes: [
    {
      fields: ['attendanceLogCode'],
      unique: true,
    },
    {
      fields: ['employee', 'punchDate', 'punchInAt'],
    },
  ],
}
