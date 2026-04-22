import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  employeeCompensationManageAccess,
  employeeCompensationReadAccess,
} from '@/access/hr'
import { TAX_REGIME_OPTIONS } from '@/lib/constants/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export const EmployeeCompensation: CollectionConfig = {
  slug: 'employee-compensation',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
    create: employeeCompensationManageAccess,
    read: employeeCompensationReadAccess,
    update: employeeCompensationManageAccess,
    delete: employeeCompensationManageAccess,
  },
  admin: {
    defaultColumns: ['compensationCode', 'employee', 'effectiveFrom', 'annualCTC', 'monthlyGross', 'isActive'],
    group: 'HRMS',
    useAsTitle: 'compensationCode',
  },
  fields: [
    {
      name: 'compensationCode',
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
      name: 'annualCTC',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'monthlyGross',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'basicMonthly',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'hraMonthly',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'specialAllowanceMonthly',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'otherAllowanceMonthly',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'variableMonthly',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'reimbursementMonthly',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'customEarnings',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0,
        },
      ],
    },
    {
      name: 'customDeductions',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0,
        },
      ],
    },
    {
      name: 'taxRegime',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: TAX_REGIME_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'pfEnabled',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'esiEnabled',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'professionalTaxEnabled',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'lwfEnabled',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'tdsEnabled',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
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

        const compensationCode = await resolveBusinessCode({
          collection: 'employee-compensation',
          data: typedData,
          fieldName: 'compensationCode',
          originalDoc: typedOriginal,
          prefix: 'CMP',
          req,
        })

        return {
          ...typedData,
          compensationCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const effectiveFrom = new Date(String(typedData.effectiveFrom ?? typedOriginal?.effectiveFrom ?? ''))
        const effectiveTo = typedData.effectiveTo ?? typedOriginal?.effectiveTo

        if (Number.isNaN(effectiveFrom.getTime())) {
          throw new APIError('Effective from date is required.', 400)
        }

        if (effectiveTo) {
          const parsedEffectiveTo = new Date(String(effectiveTo))
          if (Number.isNaN(parsedEffectiveTo.getTime())) {
            throw new APIError('Effective to date is invalid.', 400)
          }

          if (parsedEffectiveTo.getTime() < effectiveFrom.getTime()) {
            throw new APIError('Effective to date cannot be earlier than effective from date.', 400)
          }
        }

        const componentSum =
          toNumber(typedData.basicMonthly ?? typedOriginal?.basicMonthly) +
          toNumber(typedData.hraMonthly ?? typedOriginal?.hraMonthly) +
          toNumber(typedData.specialAllowanceMonthly ?? typedOriginal?.specialAllowanceMonthly) +
          toNumber(typedData.otherAllowanceMonthly ?? typedOriginal?.otherAllowanceMonthly) +
          toNumber(typedData.variableMonthly ?? typedOriginal?.variableMonthly)

        if (!typedData.monthlyGross && !typedOriginal?.monthlyGross) {
          typedData.monthlyGross = componentSum
        }

        if (toNumber(typedData.monthlyGross ?? typedOriginal?.monthlyGross) < componentSum) {
          throw new APIError('Monthly gross cannot be lower than sum of monthly earnings components.', 400)
        }

        if (operation === 'create') {
          const employeeID = typedData.employee
          const existing = await req.payload.find({
            collection: 'employee-compensation',
            depth: 0,
            limit: 1,
            overrideAccess: true,
            pagination: false,
            req,
            where: {
              and: [
                {
                  employee: {
                    equals: employeeID as number | string,
                  },
                },
                {
                  isActive: {
                    equals: true,
                  },
                },
              ],
            },
          })

          if (existing.totalDocs > 0 && (typedData.isActive ?? true) === true) {
            throw new APIError('An active compensation profile already exists for this employee.', 409)
          }
        }

        return typedData
      },
    ],
  },
  indexes: [
    {
      fields: ['compensationCode'],
      unique: true,
    },
    {
      fields: ['employee', 'effectiveFrom'],
    },
  ],
}
