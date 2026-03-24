import type { CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { applicationHistoryCreateAccess, applicationHistoryReadAccess } from '@/access/visibility'
import { APPLICATION_STAGE_OPTIONS } from '@/lib/constants/recruitment'

export const ApplicationStageHistory: CollectionConfig = {
  slug: 'application-stage-history',
  access: {
    admin: ({ req }) =>
      hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: applicationHistoryCreateAccess,
    read: applicationHistoryReadAccess,
    update: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['application', 'fromStage', 'toStage', 'actor', 'changedAt'],
    group: 'Applications',
    useAsTitle: 'toStage',
  },
  fields: [
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'applications',
      required: true,
      index: true,
    },
    {
      name: 'candidate',
      type: 'relationship',
      relationTo: 'candidates',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'candidateAccount',
      type: 'relationship',
      relationTo: 'candidate-users',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'job',
      type: 'relationship',
      relationTo: 'jobs',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'recruiter',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      filterOptions: {
        role: {
          equals: 'recruiter',
        },
      },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'fromStage',
      type: 'select',
      options: APPLICATION_STAGE_OPTIONS.map((option) => ({ ...option })),
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'toStage',
      type: 'select',
      required: true,
      options: APPLICATION_STAGE_OPTIONS.map((option) => ({ ...option })),
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'comment',
      type: 'textarea',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'changedAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}

        if (!typedData.changedAt) {
          typedData.changedAt = new Date().toISOString()
        }

        return typedData
      },
    ],
  },
  indexes: [
    {
      fields: ['application', 'changedAt'],
    },
    {
      fields: ['candidateAccount', 'changedAt'],
    },
  ],
}
