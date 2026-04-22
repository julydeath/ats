import { type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { payrollAdminManageAccess, payrollAdminReadAccess } from '@/access/hr'
import { PAYOUT_STATUS_OPTIONS } from '@/lib/constants/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const PayrollLineItems: CollectionConfig = {
  slug: 'payroll-line-items',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
    create: payrollAdminManageAccess,
    read: payrollAdminReadAccess,
    update: payrollAdminManageAccess,
    delete: payrollAdminManageAccess,
  },
  admin: {
    defaultColumns: ['payrollLineItemCode', 'payrollRun', 'employee', 'grossEarnings', 'totalDeductions', 'netPayable', 'status'],
    group: 'Payroll',
    useAsTitle: 'payrollLineItemCode',
  },
  fields: [
    {
      name: 'payrollLineItemCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'payrollRun',
      type: 'relationship',
      relationTo: 'payroll-runs',
      required: true,
      index: true,
    },
    {
      name: 'employee',
      type: 'relationship',
      relationTo: 'employee-profiles',
      required: true,
      index: true,
    },
    {
      name: 'compensation',
      type: 'relationship',
      relationTo: 'employee-compensation',
      index: true,
    },
    {
      name: 'grossEarnings',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'totalDeductions',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'netPayable',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'lopDays',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'lopDeduction',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'pfEmployee',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'pfEmployer',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'esiEmployee',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'esiEmployer',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'professionalTax',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'lwfEmployee',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'lwfEmployer',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'tds',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'reimbursementTotal',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'customEarningsTotal',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'customDeductionsTotal',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'earningsBreakdown',
      type: 'json',
    },
    {
      name: 'deductionsBreakdown',
      type: 'json',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'created',
      options: PAYOUT_STATUS_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const payrollLineItemCode = await resolveBusinessCode({
          collection: 'payroll-line-items',
          data: typedData,
          fieldName: 'payrollLineItemCode',
          originalDoc: typedOriginal,
          prefix: 'PYL',
          req,
        })

        return {
          ...typedData,
          payrollLineItemCode,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['payrollLineItemCode'],
      unique: true,
    },
    {
      fields: ['payrollRun', 'employee'],
      unique: true,
    },
  ],
}
