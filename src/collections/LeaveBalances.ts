import { type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { leaveBalanceManageAccess, leaveBalanceReadAccess } from '@/access/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const LeaveBalances: CollectionConfig = {
  slug: 'leave-balances',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: leaveBalanceManageAccess,
    read: leaveBalanceReadAccess,
    update: leaveBalanceManageAccess,
    delete: leaveBalanceManageAccess,
  },
  admin: {
    defaultColumns: ['balanceCode', 'employee', 'leaveType', 'year', 'openingBalance', 'accrued', 'used', 'closingBalance'],
    group: 'HRMS',
    useAsTitle: 'balanceCode',
  },
  fields: [
    {
      name: 'balanceCode',
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
      name: 'leaveType',
      type: 'relationship',
      relationTo: 'leave-types',
      required: true,
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
      name: 'openingBalance',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'accrued',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'used',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'adjustments',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'closingBalance',
      type: 'number',
      required: true,
      defaultValue: 0,
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

        const balanceCode = await resolveBusinessCode({
          collection: 'leave-balances',
          data: typedData,
          fieldName: 'balanceCode',
          originalDoc: typedOriginal,
          prefix: 'LBG',
          req,
        })

        return {
          ...typedData,
          balanceCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, originalDoc }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const openingBalance = Number(typedData.openingBalance ?? typedOriginal?.openingBalance ?? 0)
        const accrued = Number(typedData.accrued ?? typedOriginal?.accrued ?? 0)
        const used = Number(typedData.used ?? typedOriginal?.used ?? 0)
        const adjustments = Number(typedData.adjustments ?? typedOriginal?.adjustments ?? 0)

        return {
          ...typedData,
          closingBalance: openingBalance + accrued + adjustments - used,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['balanceCode'],
      unique: true,
    },
    {
      fields: ['employee', 'leaveType', 'year'],
      unique: true,
    },
  ],
}
