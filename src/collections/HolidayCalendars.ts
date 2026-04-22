import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { holidayCalendarManageAccess, holidayCalendarReadAccess } from '@/access/hr'
import { HOLIDAY_TYPE_OPTIONS } from '@/lib/constants/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const HolidayCalendars: CollectionConfig = {
  slug: 'holiday-calendars',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: holidayCalendarManageAccess,
    read: holidayCalendarReadAccess,
    update: holidayCalendarManageAccess,
    delete: holidayCalendarManageAccess,
  },
  admin: {
    defaultColumns: ['calendarCode', 'name', 'state', 'year', 'updatedAt'],
    group: 'HRMS',
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'calendarCode',
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
      name: 'state',
      type: 'text',
      required: true,
      index: true,
      defaultValue: 'Karnataka',
    },
    {
      name: 'year',
      type: 'number',
      required: true,
      index: true,
      min: 2000,
      max: 2200,
    },
    {
      name: 'holidays',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'date',
          type: 'date',
          required: true,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'national',
          options: HOLIDAY_TYPE_OPTIONS.map((option) => ({ ...option })),
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const calendarCode = await resolveBusinessCode({
          collection: 'holiday-calendars',
          data: typedData,
          fieldName: 'calendarCode',
          originalDoc: typedOriginal,
          prefix: 'HOL',
          req,
        })

        return {
          ...typedData,
          calendarCode,
        }
      },
    ],
    beforeChange: [
      async ({ data }) => {
        const typedData = data as Record<string, unknown>
        const year = Number(typedData.year)
        if (!Number.isFinite(year) || year < 2000 || year > 2200) {
          throw new APIError('Holiday calendar year must be valid.', 400)
        }

        const holidays = Array.isArray(typedData.holidays)
          ? (typedData.holidays as Array<Record<string, unknown>>)
          : []

        const seen = new Set<string>()
        for (const holiday of holidays) {
          const date = holiday.date
          if (!date) continue
          const key = new Date(String(date)).toISOString().slice(0, 10)
          if (seen.has(key)) {
            throw new APIError(`Duplicate holiday date detected: ${key}.`, 400)
          }
          seen.add(key)
        }

        return typedData
      },
    ],
  },
  indexes: [
    {
      fields: ['calendarCode'],
      unique: true,
    },
    {
      fields: ['state', 'year'],
      unique: true,
    },
  ],
}
