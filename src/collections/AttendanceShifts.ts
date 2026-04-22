import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { attendanceShiftManageAccess, attendanceShiftReadAccess } from '@/access/hr'
import { WEEKDAY_OPTIONS } from '@/lib/constants/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

const validateTime = (value: unknown): boolean =>
  typeof value === 'string' && /^(\d{1,2}):(\d{2})$/.test(value.trim())

export const AttendanceShifts: CollectionConfig = {
  slug: 'attendance-shifts',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: attendanceShiftManageAccess,
    read: attendanceShiftReadAccess,
    update: attendanceShiftManageAccess,
    delete: attendanceShiftManageAccess,
  },
  admin: {
    defaultColumns: ['shiftCode', 'name', 'shiftStartTime', 'shiftEndTime', 'graceMinutes', 'isDefault'],
    group: 'HRMS',
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'shiftCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'shiftStartTime',
      type: 'text',
      required: true,
      defaultValue: '09:30',
    },
    {
      name: 'shiftEndTime',
      type: 'text',
      required: true,
      defaultValue: '18:30',
    },
    {
      name: 'graceMinutes',
      type: 'number',
      required: true,
      defaultValue: 15,
      min: 0,
      max: 180,
    },
    {
      name: 'halfDayThresholdMinutes',
      type: 'number',
      required: true,
      defaultValue: 240,
      min: 0,
    },
    {
      name: 'fullDayThresholdMinutes',
      type: 'number',
      required: true,
      defaultValue: 480,
      min: 0,
    },
    {
      name: 'overtimeThresholdMinutes',
      type: 'number',
      required: true,
      defaultValue: 540,
      min: 0,
    },
    {
      name: 'weeklyOffDays',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['sunday'],
      options: WEEKDAY_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const shiftCode = await resolveBusinessCode({
          collection: 'attendance-shifts',
          data: typedData,
          fieldName: 'shiftCode',
          originalDoc: typedOriginal,
          prefix: 'SHF',
          req,
        })

        return {
          ...typedData,
          shiftCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const currentID = (originalDoc as Record<string, unknown> | undefined)?.id as number | string | undefined

        if (!validateTime(typedData.shiftStartTime) || !validateTime(typedData.shiftEndTime)) {
          throw new APIError('Shift start/end time must be in HH:mm format.', 400)
        }

        if (typedData.isDefault === true) {
          const existingDefaults = await req.payload.find({
            collection: 'attendance-shifts',
            depth: 0,
            limit: 50,
            overrideAccess: true,
            pagination: false,
            req,
            where: {
              isDefault: {
                equals: true,
              },
            },
          })

          for (const existing of existingDefaults.docs) {
            if (currentID && String(existing.id) === String(currentID)) continue
            await req.payload.update({
              collection: 'attendance-shifts',
              data: {
                isDefault: false,
              },
              id: existing.id,
              overrideAccess: true,
              req,
            })
          }
        }

        return typedData
      },
    ],
  },
  indexes: [
    {
      fields: ['shiftCode'],
      unique: true,
    },
    {
      fields: ['name'],
    },
  ],
}
