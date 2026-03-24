import { APIError, type Access, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { buildCandidateInviteExpiryDate } from '@/lib/auth/candidate-invites'
import { CANDIDATE_INVITE_STATUS_OPTIONS } from '@/lib/constants/recruitment'
import { extractRelationshipID } from '@/lib/utils/relationships'

const candidateInviteAccess: Access = ({ req: { user } }) =>
  hasInternalRole(user as InternalUserLike, ['admin', 'leadRecruiter'])

const candidateInviteAdminAccess = ({ req: { user } }: { req: { user: InternalUserLike } }): boolean =>
  hasInternalRole(user as InternalUserLike, ['admin', 'leadRecruiter'])

export const CandidateInvites: CollectionConfig = {
  slug: 'candidate-invites',
  access: {
    admin: candidateInviteAdminAccess,
    create: candidateInviteAccess,
    read: candidateInviteAccess,
    update: candidateInviteAccess,
    delete: ({ req: { user } }) => hasInternalRole(user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['candidate', 'application', 'inviteEmail', 'status', 'expiresAt', 'consumedAt'],
    group: 'Candidates',
    useAsTitle: 'inviteEmail',
  },
  fields: [
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
      name: 'application',
      type: 'relationship',
      relationTo: 'applications',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'inviteEmail',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: CANDIDATE_INVITE_STATUS_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'sentBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'consumedAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'revokedAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'accountAccessSentAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}

        if (operation !== 'create') {
          return typedData
        }

        if (!typedData.tokenHash || typeof typedData.tokenHash !== 'string') {
          throw new APIError('Invite token hash is required for secure invite links.', 400)
        }

        return {
          ...typedData,
          expiresAt: typedData.expiresAt || buildCandidateInviteExpiryDate().toISOString(),
          sentAt: typedData.sentAt || new Date().toISOString(),
          sentBy: typedData.sentBy || req.user?.id || undefined,
          status: 'pending',
        }
      },
    ],
    beforeChange: [
      async ({ data, originalDoc }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined

        const candidateID = extractRelationshipID(typedData.candidate ?? typedOriginalDoc?.candidate)
        const applicationID = extractRelationshipID(typedData.application ?? typedOriginalDoc?.application)

        if (!candidateID || !applicationID) {
          throw new APIError('Candidate invite requires candidate and application references.', 400)
        }

        const nextStatus = String(typedData.status || typedOriginalDoc?.status || 'pending')

        return {
          ...typedData,
          application: applicationID,
          candidate: candidateID,
          consumedAt:
            nextStatus === 'consumed'
              ? typedData.consumedAt || typedOriginalDoc?.consumedAt || new Date().toISOString()
              : typedOriginalDoc?.consumedAt,
          revokedAt:
            nextStatus === 'revoked'
              ? typedData.revokedAt || typedOriginalDoc?.revokedAt || new Date().toISOString()
              : typedOriginalDoc?.revokedAt,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['application', 'status'],
    },
    {
      fields: ['candidate', 'status'],
    },
    {
      fields: ['expiresAt', 'status'],
    },
  ],
}
