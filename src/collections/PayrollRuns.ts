import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { payrollAdminManageAccess, payrollAdminReadAccess } from '@/access/hr'
import { PAYROLL_RUN_STATUS_OPTIONS } from '@/lib/constants/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  approved: ['disbursing', 'cancelled'],
  cancelled: [],
  completed: [],
  disbursing: ['completed', 'failed'],
  draft: ['locked', 'cancelled'],
  failed: ['disbursing', 'cancelled'],
  locked: ['approved', 'cancelled'],
}

export const PayrollRuns: CollectionConfig = {
  slug: 'payroll-runs',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
    create: payrollAdminManageAccess,
    read: payrollAdminReadAccess,
    update: payrollAdminManageAccess,
    delete: payrollAdminManageAccess,
  },
  admin: {
    defaultColumns: ['payrollRunCode', 'payrollCycle', 'status', 'totalEmployees', 'totalGross', 'totalNet'],
    group: 'Payroll',
    useAsTitle: 'payrollRunCode',
  },
  fields: [
    {
      name: 'payrollRunCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'payrollCycle',
      type: 'relationship',
      relationTo: 'payroll-cycles',
      required: true,
      index: true,
    },
    {
      name: 'ruleSet',
      type: 'relationship',
      relationTo: 'payroll-rule-sets',
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: PAYROLL_RUN_STATUS_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'preparedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'preparedAt',
      type: 'date',
      index: true,
    },
    {
      name: 'approvedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'approvedAt',
      type: 'date',
      index: true,
    },
    {
      name: 'disbursedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'disbursedAt',
      type: 'date',
      index: true,
    },
    {
      name: 'totalEmployees',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'totalGross',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'totalDeductions',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'totalNet',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
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

        const payrollRunCode = await resolveBusinessCode({
          collection: 'payroll-runs',
          data: typedData,
          fieldName: 'payrollRunCode',
          originalDoc: typedOriginal,
          prefix: 'PYR',
          req,
        })

        return {
          ...typedData,
          payrollRunCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc }) => {
        const typedData = data as Record<string, unknown>

        if (operation === 'update' && originalDoc) {
          const previousStatus = String((originalDoc as Record<string, unknown>).status || 'draft')
          const nextStatus = String(typedData.status ?? previousStatus)

          if (nextStatus !== previousStatus) {
            const allowed = ALLOWED_TRANSITIONS[previousStatus] || []
            if (!allowed.includes(nextStatus)) {
              throw new APIError(`Invalid payroll run transition: ${previousStatus} -> ${nextStatus}.`, 400)
            }
          }
        }

        return typedData
      },
    ],
  },
  indexes: [
    {
      fields: ['payrollRunCode'],
      unique: true,
    },
    {
      fields: ['payrollCycle', 'status'],
    },
  ],
}
