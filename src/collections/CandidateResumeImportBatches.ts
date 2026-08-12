import type { Access, CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { CANDIDATE_RESUME_IMPORT_BATCH_STATUS_OPTIONS } from '@/lib/constants/recruitment'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

const resumeImportAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

const resumeImportAdminAccess = ({ req: { user } }: { req: { user: InternalUserLike } }): boolean =>
  hasInternalRole(user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

export const CandidateResumeImportBatches: CollectionConfig = {
  slug: 'candidate-resume-import-batches',
  access: {
    admin: resumeImportAdminAccess,
    create: resumeImportAccess,
    read: resumeImportAccess,
    update: resumeImportAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter']),
  },
  admin: {
    defaultColumns: ['batchCode', 'status', 'sourceJob', 'totalCount', 'parsedCount', 'createdCount', 'updatedAt'],
    group: 'Candidates',
    useAsTitle: 'batchCode',
  },
  fields: [
    {
      name: 'batchCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      index: true,
      options: CANDIDATE_RESUME_IMPORT_BATCH_STATUS_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'sourceJob',
      type: 'relationship',
      relationTo: 'jobs',
      index: true,
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'totalCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'queuedCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'processingCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'parsedCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'failedCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'createdCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'startedAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}

        if (operation === 'create') {
          typedData.batchCode = await resolveBusinessCode({
            collection: 'candidate-resume-import-batches',
            data: typedData,
            fieldName: 'batchCode',
            originalDoc: originalDoc as Record<string, unknown> | undefined,
            prefix: 'RIB',
            req,
          })

          typedData.uploadedBy ||= (req.user as InternalUserLike | null | undefined)?.id || undefined
        }

        return typedData
      },
    ],
  },
}
