import { APIError, type CollectionConfig, type Where } from 'payload'

import {
  hasInternalRole,
  type InternalUserLike,
} from '@/access/internalRoles'
import { clientCreateAccess, clientManageAccess, clientReadAccess } from '@/access/visibility'
import { CLIENT_STATUS_OPTIONS } from '@/lib/constants/recruitment'
import { buildClientDuplicateSignals } from '@/lib/jobs/dedupe'
import { extractRelationshipID } from '@/lib/utils/relationships'

const getCandidateClientSignals = (data?: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
  buildClientDuplicateSignals({
    email: data?.email ?? originalDoc?.email,
    name: data?.name ?? originalDoc?.name,
    phone: data?.phone ?? originalDoc?.phone,
  })

export const Clients: CollectionConfig = {
  slug: 'clients',
  access: {
    admin: ({ req }) =>
      hasInternalRole(req.user as InternalUserLike, ['admin', 'headRecruiter', 'leadRecruiter']),
    create: clientCreateAccess,
    read: clientReadAccess,
    update: clientManageAccess,
    delete: clientManageAccess,
  },
  admin: {
    defaultColumns: ['name', 'owningHeadRecruiter', 'contactPerson', 'email', 'status', 'updatedAt'],
    group: 'Recruitment Ops',
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'contactPerson',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'address',
      type: 'textarea',
    },
    {
      name: 'billingTerms',
      type: 'textarea',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: CLIENT_STATUS_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'owningHeadRecruiter',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      filterOptions: {
        role: {
          equals: 'headRecruiter',
        },
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'normalizedName',
      type: 'text',
      index: true,
      unique: true,
      admin: {
        hidden: true,
        readOnly: true,
      },
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

        const signals = getCandidateClientSignals(typedData, typedOriginalDoc)
        const user = req.user as InternalUserLike
        const currentUserID = user?.id ?? null
        const owningHeadRecruiterID = extractRelationshipID(
          typedData.owningHeadRecruiter ?? typedOriginalDoc?.owningHeadRecruiter,
        )

        if (
          operation === 'create' &&
          hasInternalRole(user, ['headRecruiter']) &&
          !owningHeadRecruiterID &&
          currentUserID !== null
        ) {
          typedData.owningHeadRecruiter = currentUserID
        }

        return {
          ...typedData,
          normalizedEmail: signals.normalizedEmail,
          normalizedName: signals.normalizedNameKey,
          normalizedPhone: signals.normalizedPhone,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const signals = getCandidateClientSignals(typedData, typedOriginalDoc)
        const user = req.user as InternalUserLike
        const currentUserID = user?.id ?? null
        const owningHeadRecruiterID = extractRelationshipID(
          typedData.owningHeadRecruiter ?? typedOriginalDoc?.owningHeadRecruiter,
        )

        if (!signals.normalizedNameKey) {
          throw new APIError('Client name is required for duplicate checks.', 400)
        }

        if (!owningHeadRecruiterID) {
          throw new APIError('Owning head recruiter is required.', 400)
        }

        if (hasInternalRole(user, ['headRecruiter']) && String(owningHeadRecruiterID) !== String(currentUserID)) {
          throw new APIError('Head Recruiter can only manage clients under their own ownership.', 403)
        }

        const duplicateChecks: Where[] = [
          {
            normalizedName: {
              equals: signals.normalizedNameKey,
            },
          },
        ]

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

        const andConditions: Where[] = [{ or: duplicateChecks }]

        if (operation === 'update' && originalDoc?.id) {
          andConditions.push({
            id: {
              not_equals: originalDoc.id,
            },
          })
        }

        const existing = await req.payload.find({
          collection: 'clients',
          where: {
            and: andConditions,
          },
          depth: 0,
          limit: 1,
          overrideAccess: false,
          req,
        })

        if (existing.totalDocs > 0) {
          throw new APIError(
            'Duplicate client detected. Reuse the existing client record instead of creating a new one.',
            409,
          )
        }

        return {
          ...typedData,
          normalizedEmail: signals.normalizedEmail,
          normalizedName: signals.normalizedNameKey,
          normalizedPhone: signals.normalizedPhone,
          owningHeadRecruiter: owningHeadRecruiterID,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['normalizedName'],
      unique: true,
    },
  ],
}
