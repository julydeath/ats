import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { payrollAdminManageAccess, payrollAdminReadAccess } from '@/access/hr'
import { PAYROLL_CYCLE_STATUS_OPTIONS } from '@/lib/constants/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const PayrollCycles: CollectionConfig = {
  slug: 'payroll-cycles',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
    create: payrollAdminManageAccess,
    read: payrollAdminReadAccess,
    update: payrollAdminManageAccess,
    delete: payrollAdminManageAccess,
  },
  admin: {
    defaultColumns: ['payrollCycleCode', 'month', 'year', 'startDate', 'endDate', 'status'],
    group: 'Payroll',
    useAsTitle: 'payrollCycleCode',
  },
  fields: [
    {
      name: 'payrollCycleCode',
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
      name: 'payoutDate',
      type: 'date',
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: PAYROLL_CYCLE_STATUS_OPTIONS.map((option) => ({ ...option })),
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

        const payrollCycleCode = await resolveBusinessCode({
          collection: 'payroll-cycles',
          data: typedData,
          fieldName: 'payrollCycleCode',
          originalDoc: typedOriginal,
          prefix: 'PYC',
          req,
        })

        return {
          ...typedData,
          payrollCycleCode,
        }
      },
    ],
    beforeChange: [
      async ({ data }) => {
        const typedData = data as Record<string, unknown>
        const start = new Date(String(typedData.startDate || ''))
        const end = new Date(String(typedData.endDate || ''))

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          throw new APIError('Payroll cycle start and end dates are required.', 400)
        }

        if (end.getTime() < start.getTime()) {
          throw new APIError('Payroll cycle end date cannot be before start date.', 400)
        }

        return typedData
      },
    ],
  },
  indexes: [
    {
      fields: ['payrollCycleCode'],
      unique: true,
    },
    {
      fields: ['month', 'year'],
      unique: true,
    },
  ],
}
