import type { Access, CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { CANDIDATE_RESUME_IMPORT_ITEM_STATUS_OPTIONS } from '@/lib/constants/recruitment'
import { resolveBusinessCode } from '@/lib/utils/business-codes'

const resumeImportAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

const resumeImportAdminAccess = ({ req: { user } }: { req: { user: InternalUserLike } }): boolean =>
  hasInternalRole(user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

export const CandidateResumeImportItems: CollectionConfig = {
  slug: 'candidate-resume-import-items',
  access: {
    admin: resumeImportAdminAccess,
    create: resumeImportAccess,
    read: resumeImportAccess,
    update: resumeImportAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter']),
  },
  admin: {
    defaultColumns: ['itemCode', 'status', 'batch', 'resume', 'candidate', 'updatedAt'],
    group: 'Candidates',
    useAsTitle: 'itemCode',
  },
  fields: [
    {
      name: 'itemCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'batch',
      type: 'relationship',
      relationTo: 'candidate-resume-import-batches',
      required: true,
      index: true,
    },
    {
      name: 'resume',
      type: 'relationship',
      relationTo: 'candidate-resumes',
      required: true,
      index: true,
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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      index: true,
      options: CANDIDATE_RESUME_IMPORT_ITEM_STATUS_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'parsedData',
      type: 'json',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'extractedTextPreview',
      type: 'textarea',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'warnings',
      type: 'array',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'message',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'error',
      type: 'textarea',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'attemptCount',
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
      name: 'processedAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'candidateCreatedAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'candidate',
      type: 'relationship',
      relationTo: 'candidates',
      index: true,
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}

        if (operation === 'create') {
          typedData.itemCode = await resolveBusinessCode({
            collection: 'candidate-resume-import-items',
            data: typedData,
            fieldName: 'itemCode',
            originalDoc: originalDoc as Record<string, unknown> | undefined,
            prefix: 'RII',
            req,
          })

          typedData.uploadedBy ||= (req.user as InternalUserLike | null | undefined)?.id || undefined
        }

        return typedData
      },
    ],
  },
}
