import { type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { payrollAdminManageAccess, payrollAdminReadAccess } from '@/access/hr'
import { PAYOUT_STATUS_OPTIONS } from '@/lib/constants/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const PayrollPayoutTransactions: CollectionConfig = {
  slug: 'payroll-payout-transactions',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
    create: payrollAdminManageAccess,
    read: payrollAdminReadAccess,
    update: payrollAdminManageAccess,
    delete: payrollAdminManageAccess,
  },
  admin: {
    defaultColumns: ['payoutTxnCode', 'payrollRun', 'employee', 'payoutStatus', 'attemptCount', 'payoutID', 'updatedAt'],
    group: 'Payroll',
    useAsTitle: 'payoutTxnCode',
  },
  fields: [
    {
      name: 'payoutTxnCode',
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
      name: 'lineItem',
      type: 'relationship',
      relationTo: 'payroll-line-items',
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
      name: 'provider',
      type: 'text',
      defaultValue: 'razorpayx',
      index: true,
    },
    {
      name: 'payoutStatus',
      type: 'select',
      required: true,
      defaultValue: 'created',
      options: PAYOUT_STATUS_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'payoutID',
      type: 'text',
      index: true,
      unique: true,
    },
    {
      name: 'idempotencyKey',
      type: 'text',
      required: true,
      index: true,
      unique: true,
    },
    {
      name: 'attemptCount',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'utr',
      type: 'text',
      index: true,
    },
    {
      name: 'responseLog',
      type: 'json',
    },
    {
      name: 'errorMessage',
      type: 'textarea',
    },
    {
      name: 'webhookEventID',
      type: 'text',
      index: true,
    },
    {
      name: 'initiatedAt',
      type: 'date',
      index: true,
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const payoutTxnCode = await resolveBusinessCode({
          collection: 'payroll-payout-transactions',
          data: typedData,
          fieldName: 'payoutTxnCode',
          originalDoc: typedOriginal,
          prefix: 'PPT',
          req,
        })

        return {
          ...typedData,
          payoutTxnCode,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['payoutTxnCode'],
      unique: true,
    },
    {
      fields: ['payrollRun', 'lineItem'],
      unique: true,
    },
    {
      fields: ['payoutStatus', 'updatedAt'],
    },
  ],
}
