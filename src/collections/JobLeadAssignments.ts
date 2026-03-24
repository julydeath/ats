import { APIError, type Access, type CollectionConfig, type Where } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { ASSIGNMENT_STATUS_OPTIONS } from '@/lib/constants/recruitment'
import { extractRelationshipID } from '@/lib/utils/relationships'

const jobLeadAssignmentsReadAccess: Access = ({ req }) => {
  const user = req.user as InternalUserLike

  if (!user) {
    return false
  }

  if (hasInternalRole(user, ['admin'])) {
    return true
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

const jobLeadAssignmentsManageAccess: Access = ({ req }) => {
  const user = req.user as InternalUserLike

  if (!user) {
    return false
  }

  return hasInternalRole(user, ['admin'])
}

export const JobLeadAssignments: CollectionConfig = {
  slug: 'job-lead-assignments',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter']),
    create: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
    read: jobLeadAssignmentsReadAccess,
    update: jobLeadAssignmentsManageAccess,
    delete: jobLeadAssignmentsManageAccess,
  },
  admin: {
    defaultColumns: ['job', 'client', 'leadRecruiter', 'status', 'assignedBy', 'updatedAt'],
    group: 'Assignments',
    useAsTitle: 'job',
  },
  fields: [
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
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
    },
    {
      name: 'headRecruiter',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'Admin owner for this assignment row.',
        readOnly: true,
      },
      filterOptions: {
        role: {
          equals: 'admin',
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
        const currentUserID = (req.user as InternalUserLike | null | undefined)?.id ?? null

        if (currentUserID !== null) {
          typedData.headRecruiter = currentUserID
          typedData.assignedBy = currentUserID
        }

        return typedData
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const jobID = extractRelationshipID(typedData.job ?? originalDoc?.job)
        const leadRecruiterID = extractRelationshipID(typedData.leadRecruiter ?? originalDoc?.leadRecruiter)
        const status = String(typedData.status ?? originalDoc?.status ?? 'active')
        const currentUserID = (req.user as InternalUserLike | null | undefined)?.id ?? null

        if (!jobID || !leadRecruiterID) {
          throw new APIError('Job and lead recruiter are required.', 400)
        }

        const jobDoc = await req.payload.findByID({
          collection: 'jobs',
          id: jobID,
          depth: 0,
          overrideAccess: false,
          req,
        })

        const headRecruiterID = extractRelationshipID(typedData.headRecruiter ?? originalDoc?.headRecruiter ?? currentUserID)
        const clientID = extractRelationshipID(typedData.client ?? originalDoc?.client ?? jobDoc.client)

        if (!headRecruiterID || !clientID) {
          throw new APIError('Job owner and client are required for this assignment.', 400)
        }

        if (status === 'active') {
          const activeDuplicate = await req.payload.find({
            collection: 'job-lead-assignments',
            depth: 0,
            limit: 1,
            overrideAccess: false,
            req,
            where: {
              and: [
                {
                  job: {
                    equals: jobID,
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
            throw new APIError('This lead recruiter already has an active assignment for the same job.', 409)
          }
        }

        return {
          ...typedData,
          assignedBy: typedData.assignedBy ?? originalDoc?.assignedBy ?? req.user?.id ?? null,
          client: clientID,
          headRecruiter: headRecruiterID,
          job: jobID,
          leadRecruiter: leadRecruiterID,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['job', 'leadRecruiter', 'status'],
    },
    {
      fields: ['client', 'leadRecruiter', 'status'],
    },
    {
      fields: ['headRecruiter', 'status'],
    },
  ],
}
