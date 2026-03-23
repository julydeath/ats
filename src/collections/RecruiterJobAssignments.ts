import { APIError, type Access, type CollectionConfig, type Where } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { getHeadOwnedJobIDs, getLeadAssignedClientIDs, getLeadAssignedJobIDs } from '@/lib/assignments/selectors'
import { ASSIGNMENT_STATUS_OPTIONS } from '@/lib/constants/recruitment'
import { extractRelationshipID } from '@/lib/utils/relationships'

const recruiterJobAssignmentsReadAccess: Access = async ({ req }) => {
  const user = req.user as InternalUserLike

  if (!user) {
    return false
  }

  if (hasInternalRole(user, ['admin'])) {
    return true
  }

  if (hasInternalRole(user, ['headRecruiter'])) {
    const ownedJobIDs = await getHeadOwnedJobIDs({
      headRecruiterID: user.id,
      req,
    })

    if (ownedJobIDs.length === 0) {
      return false
    }

    const where: Where = {
      job: {
        in: ownedJobIDs,
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

  if (hasInternalRole(user, ['recruiter'])) {
    const where: Where = {
      recruiter: {
        equals: user.id,
      },
    }

    return where
  }

  return false
}

const recruiterJobAssignmentsManageAccess: Access = ({ req }) => {
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

export const RecruiterJobAssignments: CollectionConfig = {
  slug: 'recruiter-job-assignments',
  access: {
    admin: ({ req }) =>
      hasInternalRole(req.user as InternalUserLike, [
        'admin',
        'headRecruiter',
        'leadRecruiter',
        'recruiter',
      ]),
    create: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter']),
    read: recruiterJobAssignmentsReadAccess,
    update: recruiterJobAssignmentsManageAccess,
    delete: recruiterJobAssignmentsManageAccess,
  },
  admin: {
    defaultColumns: ['job', 'leadRecruiter', 'recruiter', 'status', 'updatedAt'],
    group: 'Assignments',
    useAsTitle: 'recruiter',
  },
  fields: [
    {
      name: 'job',
      type: 'relationship',
      relationTo: 'jobs',
      required: true,
      index: true,
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

        if (hasInternalRole(user, ['leadRecruiter'])) {
          typedData.leadRecruiter = currentUserID
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
        const user = req.user as InternalUserLike
        const jobID = extractRelationshipID(typedData.job ?? originalDoc?.job)
        const leadRecruiterID = extractRelationshipID(typedData.leadRecruiter ?? originalDoc?.leadRecruiter)
        const recruiterID = extractRelationshipID(typedData.recruiter ?? originalDoc?.recruiter)
        const status = String(typedData.status ?? originalDoc?.status ?? 'active')
        const currentUserID = user?.id ?? null

        if (!jobID || !leadRecruiterID || !recruiterID) {
          throw new APIError('Job, lead recruiter, and recruiter are required.', 400)
        }

        if (hasInternalRole(user, ['leadRecruiter']) && String(leadRecruiterID) !== String(currentUserID)) {
          throw new APIError('Lead Recruiter can only assign jobs under themselves.', 403)
        }

        if (hasInternalRole(user, ['leadRecruiter'])) {
          const [directJobIDs, viaClientJobIDs, jobDoc] = await Promise.all([
            getLeadAssignedJobIDs({
              leadRecruiterID: leadRecruiterID,
              req,
            }),
            getLeadAssignedClientIDs({
              leadRecruiterID: leadRecruiterID,
              req,
            }),
            req.payload.findByID({
              collection: 'jobs',
              id: jobID,
              depth: 0,
              overrideAccess: false,
              req,
            }),
          ])

          const jobClientID = extractRelationshipID(jobDoc.client)
          const visibleByClient = jobClientID
            ? viaClientJobIDs.some((id) => String(id) === String(jobClientID))
            : false
          const visibleByJob = directJobIDs.some((id) => String(id) === String(jobID))

          if (!visibleByJob && !visibleByClient) {
            throw new APIError(
              'Lead Recruiter can only assign recruiters to jobs explicitly assigned to them.',
              403,
            )
          }
        }

        if (status === 'active') {
          const activeDuplicate = await req.payload.find({
            collection: 'recruiter-job-assignments',
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
                  recruiter: {
                    equals: recruiterID,
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
            throw new APIError('This recruiter already has an active assignment for the same job.', 409)
          }
        }

        return {
          ...typedData,
          assignedBy: typedData.assignedBy ?? originalDoc?.assignedBy ?? req.user?.id ?? null,
          job: jobID,
          leadRecruiter: leadRecruiterID,
          recruiter: recruiterID,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['job', 'recruiter', 'status'],
    },
    {
      fields: ['leadRecruiter', 'status'],
    },
  ],
}
