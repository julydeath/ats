import { APIError, type Access, type CollectionConfig, type Where } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { ASSIGNMENT_STATUS_OPTIONS } from '@/lib/constants/recruitment'
import { extractRelationshipID } from '@/lib/utils/relationships'

const clientLeadAssignmentsReadAccess: Access = ({ req }) => {
  const user = req.user as InternalUserLike

  if (!user) {
    return false
  }

  if (hasInternalRole(user, ['admin'])) {
    return true
  }

  if (hasInternalRole(user, ['headRecruiter'])) {
    const where: Where = {
      headRecruiter: {
        equals: user.id,
      },
    }

    return where
  }

  if (hasInternalRole(user, ['leadRecruiter'])) {
    const where: Where = {
      leadRecruiter: {
        equals: user.id,
      },
    }

    return where
  }

  return false
}

const clientLeadAssignmentsManageAccess: Access = ({ req }) => {
  const user = req.user as InternalUserLike

  if (!user) {
    return false
  }

  if (hasInternalRole(user, ['admin'])) {
    return true
  }

  if (hasInternalRole(user, ['headRecruiter'])) {
    const where: Where = {
      headRecruiter: {
        equals: user.id,
      },
    }

    return where
  }

  return false
}

export const ClientLeadAssignments: CollectionConfig = {
  slug: 'client-lead-assignments',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'headRecruiter', 'leadRecruiter']),
    create: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'headRecruiter']),
    read: clientLeadAssignmentsReadAccess,
    update: clientLeadAssignmentsManageAccess,
    delete: clientLeadAssignmentsManageAccess,
  },
  admin: {
    defaultColumns: ['client', 'headRecruiter', 'leadRecruiter', 'status', 'updatedAt'],
    group: 'Assignments',
    useAsTitle: 'leadRecruiter',
  },
  fields: [
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
      index: true,
    },
    {
      name: 'headRecruiter',
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
      name: 'leadRecruiter',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      filterOptions: {
        role: {
          equals: 'leadRecruiter',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: ASSIGNMENT_STATUS_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'assignedBy',
      type: 'relationship',
      relationTo: 'users',
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
      async ({ data, operation, req }) => {
        if (operation !== 'create') {
          return data
        }

        const typedData = (data as Record<string, unknown> | undefined) || {}
        const user = req.user as InternalUserLike
        const currentUserID = user?.id ?? null

        if (hasInternalRole(user, ['headRecruiter'])) {
          typedData.headRecruiter = currentUserID
        }

        if (currentUserID !== null) {
          typedData.assignedBy = currentUserID
        }

        return typedData
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const clientID = extractRelationshipID(typedData.client ?? originalDoc?.client)
        const headRecruiterID = extractRelationshipID(typedData.headRecruiter ?? originalDoc?.headRecruiter)
        const leadRecruiterID = extractRelationshipID(typedData.leadRecruiter ?? originalDoc?.leadRecruiter)
        const status = String(typedData.status ?? originalDoc?.status ?? 'active')
        const user = req.user as InternalUserLike
        const currentUserID = user?.id ?? null

        if (!clientID || !headRecruiterID || !leadRecruiterID) {
          throw new APIError('Client, head recruiter, and lead recruiter are required.', 400)
        }

        if (hasInternalRole(user, ['headRecruiter']) && String(headRecruiterID) !== String(currentUserID)) {
          throw new APIError('Head Recruiter can only create assignments under their own ownership.', 403)
        }

        const clientDoc = await req.payload.findByID({
          collection: 'clients',
          id: clientID,
          depth: 0,
          overrideAccess: false,
          req,
        })

        const owningHeadID = extractRelationshipID(clientDoc.owningHeadRecruiter)

        if (!owningHeadID || String(owningHeadID) !== String(headRecruiterID)) {
          throw new APIError(
            'Client ownership mismatch. The assignment head recruiter must match the client owner.',
            400,
          )
        }

        if (status === 'active') {
          const activeDuplicate = await req.payload.find({
            collection: 'client-lead-assignments',
            depth: 0,
            limit: 1,
            overrideAccess: false,
            req,
            where: {
              and: [
                {
                  client: {
                    equals: clientID,
                  },
                },
                {
                  leadRecruiter: {
                    equals: leadRecruiterID,
                  },
                },
                {
                  status: {
                    equals: 'active',
                  },
                },
                ...(operation === 'update' && originalDoc?.id
                  ? [
                      {
                        id: {
                          not_equals: originalDoc.id,
                        },
                      },
                    ]
                  : []),
              ],
            },
          })

          if (activeDuplicate.totalDocs > 0) {
            throw new APIError('This lead recruiter already has an active assignment for the same client.', 409)
          }
        }

        return {
          ...typedData,
          assignedBy: typedData.assignedBy ?? originalDoc?.assignedBy ?? req.user?.id ?? null,
          client: clientID,
          headRecruiter: headRecruiterID,
          leadRecruiter: leadRecruiterID,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['client', 'leadRecruiter', 'status'],
    },
    {
      fields: ['headRecruiter', 'status'],
    },
  ],
}
