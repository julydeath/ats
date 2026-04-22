import { type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  attendanceSummaryManageAccess,
  attendanceSummaryReadAccess,
} from '@/access/hr'
import { ATTENDANCE_STATUS_OPTIONS } from '@/lib/constants/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const AttendanceDailySummaries: CollectionConfig = {
  slug: 'attendance-daily-summaries',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: attendanceSummaryManageAccess,
    read: attendanceSummaryReadAccess,
    update: attendanceSummaryManageAccess,
    delete: attendanceSummaryManageAccess,
  },
  admin: {
    defaultColumns: ['summaryCode', 'employee', 'date', 'status', 'workedMinutes', 'lop'],
    group: 'HRMS',
    useAsTitle: 'summaryCode',
  },
  fields: [
    {
      name: 'summaryCode',
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
      name: 'date',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'absent',
      options: ATTENDANCE_STATUS_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'workedMinutes',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'lateMinutes',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'overtimeMinutes',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'lop',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'holidayName',
      type: 'text',
    },
    {
      name: 'attendanceLog',
      type: 'relationship',
      relationTo: 'attendance-logs',
    },
    {
      name: 'leaveRequest',
      type: 'relationship',
      relationTo: 'leave-requests',
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const summaryCode = await resolveBusinessCode({
          collection: 'attendance-daily-summaries',
          data: typedData,
          fieldName: 'summaryCode',
          originalDoc: typedOriginal,
          prefix: 'ADS',
          req,
        })

        return {
          ...typedData,
          summaryCode,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['summaryCode'],
      unique: true,
    },
    {
      fields: ['employee', 'date'],
      unique: true,
    },
    {
      fields: ['status', 'date'],
    },
  ],
}
