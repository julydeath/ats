import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { leaveTypeManageAccess, leaveTypeReadAccess } from '@/access/hr'
import { LEAVE_TYPE_KEY_OPTIONS, LEAVE_UNIT_OPTIONS } from '@/lib/constants/hr'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

export const LeaveTypes: CollectionConfig = {
  slug: 'leave-types',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: leaveTypeManageAccess,
    read: leaveTypeReadAccess,
    update: leaveTypeManageAccess,
    delete: leaveTypeManageAccess,
  },
  admin: {
    defaultColumns: ['leaveTypeCode', 'key', 'name', 'paid', 'annualAllowance', 'accrualPerMonth', 'isActive'],
    group: 'HRMS',
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'leaveTypeCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'key',
      type: 'select',
      required: true,
      options: LEAVE_TYPE_KEY_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'paid',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'accrualPerMonth',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 1,
    },
    {
      name: 'annualAllowance',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 12,
    },
    {
      name: 'carryForwardLimit',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'isEncashable',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'minUnit',
      type: 'select',
      required: true,
      defaultValue: 'fullDay',
      options: LEAVE_UNIT_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'maxConsecutiveDays',
      type: 'number',
      required: true,
      min: 1,
      defaultValue: 15,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const leaveTypeCode = await resolveBusinessCode({
          collection: 'leave-types',
          data: typedData,
          fieldName: 'leaveTypeCode',
          originalDoc: typedOriginal,
          prefix: 'LTP',
          req,
        })

        return {
          ...typedData,
          leaveTypeCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const key = String(typedData.key ?? ((originalDoc as Record<string, unknown> | undefined)?.key || ''))

        if (!['CL', 'SL', 'EL'].includes(key)) {
          throw new APIError('Leave type key must be one of CL, SL, EL.', 400)
        }

        if (operation === 'create') {
          const existing = await req.payload.find({
            collection: 'leave-types',
            depth: 0,
            limit: 1,
            overrideAccess: true,
            pagination: false,
            req,
            where: {
              key: {
                equals: key,
              },
            },
          })

          if (existing.totalDocs > 0) {
            throw new APIError(`Leave type ${key} already exists.`, 409)
          }
        }

        return typedData
      },
    ],
  },
  indexes: [
    {
      fields: ['leaveTypeCode'],
      unique: true,
    },
    {
      fields: ['key'],
      unique: true,
    },
  ],
}
