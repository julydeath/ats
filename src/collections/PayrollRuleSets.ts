import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { payrollAdminManageAccess, payrollAdminReadAccess } from '@/access/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const PayrollRuleSets: CollectionConfig = {
  slug: 'payroll-rule-sets',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
    create: payrollAdminManageAccess,
    read: payrollAdminReadAccess,
    update: payrollAdminManageAccess,
    delete: payrollAdminManageAccess,
  },
  admin: {
    defaultColumns: ['ruleSetCode', 'name', 'state', 'effectiveFrom', 'isActive'],
    group: 'Payroll',
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'ruleSetCode',
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
      defaultValue: 'Karnataka',
      index: true,
    },
    {
      name: 'effectiveFrom',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'effectiveTo',
      type: 'date',
      index: true,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
    {
      name: 'pfEnabled',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'pfEmployeeRate',
      type: 'number',
      defaultValue: 12,
      min: 0,
      max: 100,
    },
    {
      name: 'pfEmployerRate',
      type: 'number',
      defaultValue: 12,
      min: 0,
      max: 100,
    },
    {
      name: 'pfWageCap',
      type: 'number',
      defaultValue: 15000,
      min: 0,
    },
    {
      name: 'esiEnabled',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'esiEmployeeRate',
      type: 'number',
      defaultValue: 0.75,
      min: 0,
      max: 100,
    },
    {
      name: 'esiEmployerRate',
      type: 'number',
      defaultValue: 3.25,
      min: 0,
      max: 100,
    },
    {
      name: 'esiWageThreshold',
      type: 'number',
      defaultValue: 21000,
      min: 0,
    },
    {
      name: 'professionalTaxEnabled',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'professionalTaxMonthly',
      type: 'number',
      defaultValue: 200,
      min: 0,
    },
    {
      name: 'lwfEnabled',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'lwfEmployeeMonthly',
      type: 'number',
      defaultValue: 20,
      min: 0,
    },
    {
      name: 'lwfEmployerMonthly',
      type: 'number',
      defaultValue: 40,
      min: 0,
    },
    {
      name: 'tdsEnabled',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'tdsRate',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 100,
    },
    {
      name: 'standardDeductionMonthly',
      type: 'number',
      defaultValue: 0,
      min: 0,
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

        const ruleSetCode = await resolveBusinessCode({
          collection: 'payroll-rule-sets',
          data: typedData,
          fieldName: 'ruleSetCode',
          originalDoc: typedOriginal,
          prefix: 'PRR',
          req,
        })

        return {
          ...typedData,
          ruleSetCode,
        }
      },
    ],
    beforeChange: [
      async ({ data }) => {
        const typedData = data as Record<string, unknown>
        const from = new Date(String(typedData.effectiveFrom || ''))
        const to = typedData.effectiveTo ? new Date(String(typedData.effectiveTo)) : null

        if (Number.isNaN(from.getTime())) {
          throw new APIError('Rule set effective from date is required.', 400)
        }

        if (to && Number.isNaN(to.getTime())) {
          throw new APIError('Rule set effective to date is invalid.', 400)
        }

        if (to && to.getTime() < from.getTime()) {
          throw new APIError('Rule set effective to date cannot be before effective from.', 400)
        }

        return typedData
      },
    ],
  },
  indexes: [
    {
      fields: ['ruleSetCode'],
      unique: true,
    },
    {
      fields: ['state', 'effectiveFrom'],
    },
  ],
}
