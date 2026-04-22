import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { performanceCycleManageAccess, performanceCycleReadAccess } from '@/access/hr'
import {
  PERFORMANCE_CYCLE_STATUS_OPTIONS,
  PERFORMANCE_DEFAULT_KPI_WEIGHT,
  PERFORMANCE_DEFAULT_MANAGER_WEIGHT,
} from '@/lib/constants/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const PerformanceCycles: CollectionConfig = {
  slug: 'performance-cycles',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: performanceCycleManageAccess,
    read: performanceCycleReadAccess,
    update: performanceCycleManageAccess,
    delete: performanceCycleManageAccess,
  },
  admin: {
    defaultColumns: ['cycleCode', 'title', 'month', 'year', 'startDate', 'endDate', 'status'],
    group: 'HRMS',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'cycleCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'month',
      type: 'number',
      required: true,
      min: 1,
      max: 12,
      index: true,
    },
    {
      name: 'year',
      type: 'number',
      required: true,
      min: 2000,
      max: 2200,
      index: true,
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'kpiWeight',
      type: 'number',
      required: true,
      min: 0,
      max: 100,
      defaultValue: PERFORMANCE_DEFAULT_KPI_WEIGHT,
    },
    {
      name: 'managerWeight',
      type: 'number',
      required: true,
      min: 0,
      max: 100,
      defaultValue: PERFORMANCE_DEFAULT_MANAGER_WEIGHT,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: PERFORMANCE_CYCLE_STATUS_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const cycleCode = await resolveBusinessCode({
          collection: 'performance-cycles',
          data: typedData,
          fieldName: 'cycleCode',
          originalDoc: typedOriginal,
          prefix: 'PRC',
          req,
        })

        return {
          ...typedData,
          cycleCode,
        }
      },
    ],
    beforeChange: [
      async ({ data }) => {
        const typedData = data as Record<string, unknown>
        const start = new Date(String(typedData.startDate || ''))
        const end = new Date(String(typedData.endDate || ''))
        const kpiWeight = Number(typedData.kpiWeight || PERFORMANCE_DEFAULT_KPI_WEIGHT)
        const managerWeight = Number(typedData.managerWeight || PERFORMANCE_DEFAULT_MANAGER_WEIGHT)

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          throw new APIError('Cycle start/end dates are required.', 400)
        }

        if (end.getTime() < start.getTime()) {
          throw new APIError('Cycle end date cannot be earlier than start date.', 400)
        }

        if (kpiWeight + managerWeight !== 100) {
          throw new APIError('KPI and manager weights must add up to 100.', 400)
        }

        return typedData
      },
    ],
  },
  indexes: [
    {
      fields: ['cycleCode'],
      unique: true,
    },
    {
      fields: ['month', 'year'],
      unique: true,
    },
  ],
}
