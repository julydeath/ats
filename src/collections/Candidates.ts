import { APIError, type CollectionConfig, type Where } from 'payload'

import { isCandidateAuthenticated, type CandidateUserLike } from '@/access/candidateRoles'
import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { candidatesCreateAccess, candidatesManageAccess, candidatesReadAccess } from '@/access/visibility'
import { buildCandidateDuplicateSignals } from '@/lib/candidates/dedupe'
import { CANDIDATE_SOURCE_OPTIONS } from '@/lib/constants/recruitment'
import { extractRelationshipID } from '@/lib/utils/relationships'

const getCandidateSignals = (data?: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
  buildCandidateDuplicateSignals({
    email: data?.email ?? originalDoc?.email,
    fullName: data?.fullName ?? originalDoc?.fullName,
    phone: data?.phone ?? originalDoc?.phone,
  })

export const Candidates: CollectionConfig = {
  slug: 'candidates',
  access: {
    admin: ({ req }) =>
      hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: candidatesCreateAccess,
    read: candidatesReadAccess,
    update: candidatesManageAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['fullName', 'email', 'phone', 'source', 'sourceJob', 'sourcedBy', 'updatedAt'],
    group: 'Candidates',
    useAsTitle: 'fullName',
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'email',
      type: 'email',
      index: true,
    },
    {
      name: 'phone',
      type: 'text',
      index: true,
    },
    {
      name: 'alternatePhone',
      type: 'text',
    },
    {
      name: 'currentLocation',
      type: 'text',
    },
    {
      name: 'totalExperienceYears',
      type: 'number',
      min: 0,
    },
    {
      name: 'currentCompany',
      type: 'text',
    },
    {
      name: 'currentRole',
      type: 'text',
    },
    {
      name: 'skills',
      type: 'text',
      hasMany: true,
    },
    {
      name: 'expectedSalary',
      type: 'number',
      min: 0,
    },
    {
      name: 'noticePeriodDays',
      type: 'number',
      min: 0,
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'linkedin',
      options: CANDIDATE_SOURCE_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'sourceDetails',
      type: 'text',
    },
    {
      name: 'resume',
      type: 'relationship',
      relationTo: 'candidate-resumes',
    },
    {
      name: 'linkedInURL',
      type: 'text',
    },
    {
      name: 'portfolioURL',
      type: 'text',
    },
    {
      name: 'sourceJob',
      type: 'relationship',
      relationTo: 'jobs',
      required: true,
      index: true,
    },
    {
      name: 'sourcedBy',
      type: 'relationship',
      relationTo: 'users',
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
      name: 'profileCompletedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'normalizedEmail',
      type: 'text',
      index: true,
      unique: true,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'normalizedPhone',
      type: 'text',
      index: true,
      unique: true,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const signals = getCandidateSignals(typedData, typedOriginalDoc)
        const currentUserID = (req.user as InternalUserLike | null | undefined)?.id ?? null

        if (operation === 'create' && currentUserID !== null && !typedData.sourcedBy) {
          typedData.sourcedBy = currentUserID
        }

        return {
          ...typedData,
          normalizedEmail: signals.normalizedEmail,
          normalizedPhone: signals.normalizedPhone,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const user = req.user as InternalUserLike
        const candidateUser = req.user as CandidateUserLike
        const sourceJobID = extractRelationshipID(typedData.sourceJob ?? typedOriginalDoc?.sourceJob)
        const resumeID = extractRelationshipID(typedData.resume ?? typedOriginalDoc?.resume)
        const sourcedByID = extractRelationshipID(typedData.sourcedBy ?? typedOriginalDoc?.sourcedBy ?? user?.id)
        const signals = getCandidateSignals(typedData, typedOriginalDoc)

        if (!sourceJobID) {
          throw new APIError('Source job is required for recruiter sourcing.', 400)
        }

        if (!signals.normalizedEmail && !signals.normalizedPhone) {
          throw new APIError('Either email or phone number is required for candidate dedupe checks.', 400)
        }

        if (operation === 'update' && isCandidateAuthenticated(candidateUser)) {
          if ('source' in typedData && typedData.source !== typedOriginalDoc?.source) {
            throw new APIError('Candidate cannot change sourcing ownership fields.', 403)
          }

          if (
            'sourceJob' in typedData &&
            String(extractRelationshipID(typedData.sourceJob)) !==
              String(extractRelationshipID(typedOriginalDoc?.sourceJob))
          ) {
            throw new APIError('Candidate cannot change source job mapping.', 403)
          }

          if (
            'sourcedBy' in typedData &&
            String(extractRelationshipID(typedData.sourcedBy)) !==
              String(extractRelationshipID(typedOriginalDoc?.sourcedBy))
          ) {
            throw new APIError('Candidate cannot change sourcing ownership fields.', 403)
          }

          if (
            'resume' in typedData &&
            String(extractRelationshipID(typedData.resume)) !== String(extractRelationshipID(typedOriginalDoc?.resume))
          ) {
            throw new APIError('Candidate cannot re-link resume through direct profile updates.', 403)
          }
        }

        const duplicateChecks: Where[] = []

        if (signals.normalizedEmail) {
          duplicateChecks.push({
            normalizedEmail: {
              equals: signals.normalizedEmail,
            },
          })
        }

        if (signals.normalizedPhone) {
          duplicateChecks.push({
            normalizedPhone: {
              equals: signals.normalizedPhone,
            },
          })
        }

        if (duplicateChecks.length === 0) {
          throw new APIError('Candidate contact details are required.', 400)
        }

        const andConditions: Where[] = [{ or: duplicateChecks }]

        if (operation === 'update' && typedOriginalDoc?.id) {
          andConditions.push({
            id: {
              not_equals: typedOriginalDoc.id,
            },
          })
        }

        const existing = await req.payload.find({
          collection: 'candidates',
          depth: 0,
          limit: 1,
          overrideAccess: true,
          req,
          where: {
            and: andConditions,
          },
        })

        if (existing.totalDocs > 0) {
          throw new APIError('Duplicate candidate detected with same email or phone.', 409)
        }

        return {
          ...typedData,
          normalizedEmail: signals.normalizedEmail,
          normalizedPhone: signals.normalizedPhone,
          resume: resumeID ?? undefined,
          sourceJob: sourceJobID,
          sourcedBy: sourcedByID ?? undefined,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['sourceJob', 'updatedAt'],
    },
    {
      fields: ['source', 'updatedAt'],
    },
    {
      fields: ['sourcedBy', 'updatedAt'],
    },
  ],
}
