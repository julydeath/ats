import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { jobTemplatesManageAccess, jobTemplatesReadAccess } from '@/access/visibility'
import {
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PRIORITY_OPTIONS,
} from '@/lib/constants/recruitment'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export const JobTemplates: CollectionConfig = {
  slug: 'job-templates',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter']),
    create: jobTemplatesManageAccess,
    read: jobTemplatesReadAccess,
    update: jobTemplatesManageAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['templateCode', 'templateName', 'employmentType', 'priority', 'isActive', 'updatedAt'],
    group: 'Recruitment Ops',
    useAsTitle: 'templateName',
  },
  fields: [
    {
      name: 'templateCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'templateName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'requisitionTitle',
      type: 'text',
    },
    {
      name: 'department',
      type: 'text',
    },
    {
      name: 'businessUnit',
      type: 'text',
    },
    {
      name: 'employmentType',
      type: 'select',
      required: true,
      options: JOB_EMPLOYMENT_TYPE_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'states',
      type: 'text',
      hasMany: true,
    },
    {
      name: 'salaryMin',
      type: 'number',
      min: 0,
    },
    {
      name: 'salaryMax',
      type: 'number',
      min: 0,
    },
    {
      name: 'experienceMin',
      type: 'number',
      min: 0,
    },
    {
      name: 'experienceMax',
      type: 'number',
      min: 0,
    },
    {
      name: 'openings',
      type: 'number',
      min: 1,
      defaultValue: 1,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'requiredSkills',
      type: 'array',
      fields: [
        {
          name: 'skill',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'priority',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: JOB_PRIORITY_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
    {
      name: 'ownedByLeadRecruiter',
      type: 'relationship',
      relationTo: 'users',
      filterOptions: {
        role: {
          equals: 'leadRecruiter',
        },
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined

        const templateCode = await resolveBusinessCode({
          collection: 'job-templates',
          data: typedData,
          fieldName: 'templateCode',
          originalDoc: typedOriginalDoc,
          prefix: 'JTPL',
          req,
        })

        return {
          ...typedData,
          templateCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const user = req.user as InternalUserLike
        const currentUserID = toNumericID(user?.id)

        const salaryMin = toNumberOrNull(typedData.salaryMin ?? typedOriginalDoc?.salaryMin)
        const salaryMax = toNumberOrNull(typedData.salaryMax ?? typedOriginalDoc?.salaryMax)
        const experienceMin = toNumberOrNull(typedData.experienceMin ?? typedOriginalDoc?.experienceMin)
        const experienceMax = toNumberOrNull(typedData.experienceMax ?? typedOriginalDoc?.experienceMax)
        const openings = toNumberOrNull(typedData.openings ?? typedOriginalDoc?.openings)

        if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
          throw new APIError('Salary min cannot be greater than salary max.', 400)
        }

        if (experienceMin !== null && experienceMax !== null && experienceMin > experienceMax) {
          throw new APIError('Experience min cannot be greater than experience max.', 400)
        }

        if (openings !== null && openings < 1) {
          throw new APIError('Openings must be at least 1.', 400)
        }

        return {
          ...typedData,
          createdBy:
            operation === 'create' ? typedData.createdBy ?? currentUserID ?? undefined : typedOriginalDoc?.createdBy,
          templateCode: typedData.templateCode ?? typedOriginalDoc?.templateCode,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['templateCode'],
      unique: true,
    },
    {
      fields: ['templateName', 'isActive'],
    },
  ],
}
