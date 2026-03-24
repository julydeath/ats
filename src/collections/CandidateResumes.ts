import type { CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  candidateResumeCreateAccess,
  candidateResumeDeleteAccess,
  candidateResumeReadAccess,
} from '@/access/visibility'

export const CandidateResumes: CollectionConfig = {
  slug: 'candidate-resumes',
  access: {
    admin: ({ req }) =>
      hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: candidateResumeCreateAccess,
    read: candidateResumeReadAccess,
    update: candidateResumeDeleteAccess,
    delete: candidateResumeDeleteAccess,
  },
  admin: {
    defaultColumns: ['filename', 'sourceJob', 'uploadedBy', 'updatedAt'],
    group: 'Candidates',
    useAsTitle: 'filename',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'sourceJob',
      type: 'relationship',
      relationTo: 'jobs',
      required: true,
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
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') {
          return data
        }

        const typedData = (data as Record<string, unknown> | undefined) || {}
        const currentUserID = (req.user as InternalUserLike | null | undefined)?.id ?? null

        if (currentUserID !== null && !typedData.uploadedBy) {
          typedData.uploadedBy = currentUserID
        }

        return typedData
      },
    ],
  },
  upload: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    staticDir: 'media/candidate-resumes',
  },
}
