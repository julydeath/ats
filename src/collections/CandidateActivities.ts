import type { CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  candidateActivitiesCreateAccess,
  candidateActivitiesDeleteAccess,
  candidateActivitiesReadAccess,
  candidateActivitiesUpdateAccess,
} from '@/access/visibility'
import {
  CANDIDATE_ACTIVITY_PRIORITY_OPTIONS,
  CANDIDATE_ACTIVITY_STATUS_OPTIONS,
  CANDIDATE_ACTIVITY_TYPE_OPTIONS,
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

export const CandidateActivities: CollectionConfig = {
  slug: 'candidate-activities',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: candidateActivitiesCreateAccess,
    read: candidateActivitiesReadAccess,
    update: candidateActivitiesUpdateAccess,
    delete: candidateActivitiesDeleteAccess,
  },
  admin: {
    defaultColumns: ['activityCode', 'candidate', 'type', 'priority', 'status', 'dueAt', 'updatedAt'],
    group: 'Candidates',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'activityCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'candidate',
      type: 'relationship',
      relationTo: 'candidates',
      required: true,
      index: true,
    },
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'applications',
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'note',
      index: true,
      options: CANDIDATE_ACTIVITY_TYPE_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'priority',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      index: true,
      options: CANDIDATE_ACTIVITY_PRIORITY_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      index: true,
      options: CANDIDATE_ACTIVITY_STATUS_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'actionRequired',
      type: 'text',
    },
    {
      name: 'dueAt',
      type: 'date',
      index: true,
    },
    {
      name: 'timezone',
      type: 'text',
      defaultValue: 'Asia/Kolkata',
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'modifiedOn',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'statusModifiedOn',
      type: 'date',
      index: true,
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

        const activityCode = await resolveBusinessCode({
          collection: 'candidate-activities',
          data: typedData,
          fieldName: 'activityCode',
          originalDoc: typedOriginalDoc,
          prefix: 'ACT',
          req,
        })

        return {
          ...typedData,
          activityCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const user = req.user as InternalUserLike
        const currentUserID = toNumericID(user?.id)
        const nowISO = new Date().toISOString()

        const currentStatus = String(typedOriginalDoc?.status || '')
        const nextStatus = String(typedData.status ?? typedOriginalDoc?.status ?? 'open')

        return {
          ...typedData,
          activityCode: typedData.activityCode ?? typedOriginalDoc?.activityCode,
          createdBy:
            operation === 'create' ? typedData.createdBy ?? currentUserID ?? undefined : typedOriginalDoc?.createdBy,
          modifiedOn: nowISO,
          statusModifiedOn: currentStatus === nextStatus ? typedOriginalDoc?.statusModifiedOn : nowISO,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['activityCode'],
      unique: true,
    },
    {
      fields: ['candidate', 'type', 'updatedAt'],
    },
    {
      fields: ['assignedTo', 'status', 'dueAt'],
    },
  ],
}
