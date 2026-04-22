import { type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { payrollAdminManageAccess, payrollAdminReadAccess } from '@/access/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const Payslips: CollectionConfig = {
  slug: 'payslips',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
    create: payrollAdminManageAccess,
    read: payrollAdminReadAccess,
    update: payrollAdminManageAccess,
    delete: payrollAdminManageAccess,
  },
  admin: {
    defaultColumns: ['payslipCode', 'employee', 'month', 'year', 'status', 'issueDate'],
    group: 'Payroll',
    useAsTitle: 'payslipCode',
  },
  fields: [
    {
      name: 'payslipCode',
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
      name: 'payrollRun',
      type: 'relationship',
      relationTo: 'payroll-runs',
      required: true,
      index: true,
    },
    {
      name: 'payrollLineItem',
      type: 'relationship',
      relationTo: 'payroll-line-items',
      index: true,
      unique: true,
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
      name: 'issueDate',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'pdfURL',
      type: 'text',
    },
    {
      name: 'snapshot',
      type: 'json',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'generated',
      options: [
        { label: 'Generated', value: 'generated' },
        { label: 'Published', value: 'published' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      index: true,
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const payslipCode = await resolveBusinessCode({
          collection: 'payslips',
          data: typedData,
          fieldName: 'payslipCode',
          originalDoc: typedOriginal,
          prefix: 'PSL',
          req,
        })

        return {
          ...typedData,
          payslipCode,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['payslipCode'],
      unique: true,
    },
    {
      fields: ['employee', 'month', 'year'],
    },
  ],
}
