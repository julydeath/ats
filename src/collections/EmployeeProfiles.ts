import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  employeeProfileManageAccess,
  employeeProfileReadAccess,
} from '@/access/hr'
import {
  EMPLOYMENT_STATUS_OPTIONS,
  WEEKDAY_OPTIONS,
} from '@/lib/constants/hr'
import { readRelationID } from '@/lib/hr/common'
import { resolveBusinessCode } from '@/lib/utils/business-codes'
import type { User } from '@/payload-types'

const bankDetailsReadAccess = ({ req }: { req: { user: InternalUserLike } }) =>
  hasInternalRole(req.user, ['admin'])

export const EmployeeProfiles: CollectionConfig = {
  slug: 'employee-profiles',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: employeeProfileManageAccess,
    read: employeeProfileReadAccess,
    update: employeeProfileManageAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['employeeCode', 'user', 'employmentStatus', 'designation', 'department', 'workState', 'updatedAt'],
    group: 'HRMS',
    useAsTitle: 'employeeCode',
  },
  fields: [
    {
      name: 'employeeCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      unique: true,
      filterOptions: {
        role: {
          in: ['admin', 'leadRecruiter', 'recruiter'],
        },
      },
    },
    {
      name: 'dateOfJoining',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'employmentStatus',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: EMPLOYMENT_STATUS_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'designation',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'department',
      type: 'text',
      defaultValue: 'Recruitment',
      index: true,
    },
    {
      name: 'workLocation',
      type: 'text',
      required: true,
    },
    {
      name: 'workState',
      type: 'text',
      required: true,
      defaultValue: 'Karnataka',
      index: true,
    },
    {
      name: 'workCountry',
      type: 'text',
      defaultValue: 'India',
    },
    {
      name: 'reportingManager',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      filterOptions: {
        role: {
          in: ['admin', 'leadRecruiter'],
        },
      },
    },
    {
      name: 'attendanceShift',
      type: 'relationship',
      relationTo: 'attendance-shifts',
      index: true,
    },
    {
      name: 'holidayCalendar',
      type: 'relationship',
      relationTo: 'holiday-calendars',
      index: true,
    },
    {
      name: 'weeklyOffDays',
      type: 'select',
      hasMany: true,
      options: WEEKDAY_OPTIONS.map((option) => ({ ...option })),
      defaultValue: ['sunday'],
    },
    {
      name: 'isPayrollEligible',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
    {
      name: 'payoutReady',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'panNumber',
      type: 'text',
      access: {
        read: bankDetailsReadAccess,
        update: bankDetailsReadAccess,
      },
    },
    {
      name: 'aadhaarNumber',
      type: 'text',
      access: {
        read: bankDetailsReadAccess,
        update: bankDetailsReadAccess,
      },
    },
    {
      name: 'uanNumber',
      type: 'text',
      access: {
        read: bankDetailsReadAccess,
        update: bankDetailsReadAccess,
      },
    },
    {
      name: 'esicNumber',
      type: 'text',
      access: {
        read: bankDetailsReadAccess,
        update: bankDetailsReadAccess,
      },
    },
    {
      name: 'bankAccountName',
      type: 'text',
      access: {
        read: bankDetailsReadAccess,
        update: bankDetailsReadAccess,
      },
    },
    {
      name: 'bankAccountNumber',
      type: 'text',
      access: {
        read: bankDetailsReadAccess,
        update: bankDetailsReadAccess,
      },
    },
    {
      name: 'bankIFSC',
      type: 'text',
      access: {
        read: bankDetailsReadAccess,
        update: bankDetailsReadAccess,
      },
    },
    {
      name: 'bankName',
      type: 'text',
      access: {
        read: bankDetailsReadAccess,
        update: bankDetailsReadAccess,
      },
    },
    {
      name: 'razorpayContactID',
      type: 'text',
      access: {
        read: bankDetailsReadAccess,
        update: bankDetailsReadAccess,
      },
    },
    {
      name: 'razorpayFundAccountID',
      type: 'text',
      index: true,
      access: {
        read: bankDetailsReadAccess,
        update: bankDetailsReadAccess,
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

        const employeeCode = await resolveBusinessCode({
          collection: 'employee-profiles',
          data: typedData,
          fieldName: 'employeeCode',
          originalDoc: typedOriginal,
          prefix: 'EMP',
          req,
        })

        return {
          ...typedData,
          employeeCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const userID = readRelationID(typedData.user ?? (originalDoc as Record<string, unknown> | undefined)?.user)
        const actor = req.user as InternalUserLike

        if (!userID) {
          throw new APIError('User mapping is required for employee profile.', 400)
        }

        const userDoc: User = await req.payload.findByID({
          collection: 'users',
          depth: 0,
          id: userID,
          overrideAccess: true,
          req,
        })

        const role = String(userDoc.role || '')
        if (!['admin', 'leadRecruiter', 'recruiter'].includes(role)) {
          throw new APIError('Only internal users can be mapped to employee profiles.', 400)
        }

        if (hasInternalRole(actor, ['leadRecruiter']) && role !== 'recruiter') {
          throw new APIError('Lead recruiter can only manage recruiter employee profiles.', 403)
        }

        if (operation === 'create') {
          const existing = await req.payload.find({
            collection: 'employee-profiles',
            depth: 0,
            limit: 1,
            overrideAccess: true,
            pagination: false,
            req,
            where: {
              user: {
                equals: userID,
              },
            },
          })

          if (existing.totalDocs > 0) {
            throw new APIError('Employee profile already exists for this user.', 409)
          }

          if (hasInternalRole(actor, ['leadRecruiter']) && actor?.id) {
            typedData.reportingManager = actor.id
          }
        }

        return typedData
      },
    ],
  },
  indexes: [
    {
      fields: ['employeeCode'],
      unique: true,
    },
    {
      fields: ['user'],
      unique: true,
    },
    {
      fields: ['employmentStatus', 'workState'],
    },
  ],
}
