import { APIError, type CollectionConfig, type Endpoint, type PayloadRequest, type Where } from 'payload'

import {
  hasInternalRole,
  type InternalUserLike,
} from '@/access/internalRoles'
import { jobsCreateAccess, jobsManageAccess, jobsReadAccess } from '@/access/visibility'
import {
  ACTIVE_JOB_STATUSES,
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
  REACTIVATABLE_JOB_STATUSES,
} from '@/lib/constants/recruitment'
import { buildJobDedupeKey } from '@/lib/jobs/dedupe'
import { resolveBusinessCode } from '@/lib/utils/business-codes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const activeJobStatusSet = new Set<string>(ACTIVE_JOB_STATUSES)
const reactivatableJobStatusSet = new Set<string>(REACTIVATABLE_JOB_STATUSES)

const getDedupeInput = (data?: Record<string, unknown>, originalDoc?: Record<string, unknown>) => ({
  client: data?.client ?? originalDoc?.client,
  department: data?.department ?? originalDoc?.department,
  description: data?.description ?? originalDoc?.description,
  employmentType: data?.employmentType ?? originalDoc?.employmentType,
  location: data?.location ?? originalDoc?.location,
  requiredSkills: data?.requiredSkills ?? originalDoc?.requiredSkills,
  title: data?.title ?? originalDoc?.title,
})

const getNumericValue = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const validateJobRanges = (data?: Record<string, unknown>, originalDoc?: Record<string, unknown>) => {
  const salaryMin = getNumericValue(data?.salaryMin ?? originalDoc?.salaryMin)
  const salaryMax = getNumericValue(data?.salaryMax ?? originalDoc?.salaryMax)
  const experienceMin = getNumericValue(data?.experienceMin ?? originalDoc?.experienceMin)
  const experienceMax = getNumericValue(data?.experienceMax ?? originalDoc?.experienceMax)
  const openings = getNumericValue(data?.openings ?? originalDoc?.openings)

  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    throw new APIError('Salary min cannot be greater than salary max.', 400)
  }

  if (experienceMin !== null && experienceMax !== null && experienceMin > experienceMax) {
    throw new APIError('Experience min cannot be greater than experience max.', 400)
  }

  if (openings !== null && openings < 1) {
    throw new APIError('Openings must be at least 1.', 400)
  }
}

const findMatchingJobs = async ({
  clientID,
  dedupeKey,
  excludeID,
  req,
}: {
  clientID: number | string
  dedupeKey: string
  excludeID?: number | string
  req: PayloadRequest
}) => {
  const andConditions: Where[] = [
    {
      client: {
        equals: clientID,
      },
    },
    {
      dedupeKey: {
        equals: dedupeKey,
      },
    },
  ]

  if (excludeID !== undefined && excludeID !== null) {
    andConditions.push({
      id: {
        not_equals: excludeID,
      },
    })
  }

  return req.payload.find({
    collection: 'jobs',
    where: {
      and: andConditions,
    },
    depth: 0,
    limit: 20,
    overrideAccess: false,
    req,
  })
}

const reactivateJobEndpoint: Endpoint = {
  path: '/reactivate/:id',
  method: 'post',
  handler: async (req) => {
    if (!hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter'])) {
      throw new APIError('Forbidden', 403)
    }

    const routeID = req.routeParams?.id
    const targetID = typeof routeID === 'number' || typeof routeID === 'string' ? routeID : null

    if (!targetID) {
      throw new APIError('Job ID is required.', 400)
    }

    const existingJob = await req.payload.findByID({
      collection: 'jobs',
      id: targetID,
      depth: 0,
      overrideAccess: false,
      req,
    })

    if (!reactivatableJobStatusSet.has(String(existingJob.status))) {
      throw new APIError('Only inactive or closed jobs can be reactivated.', 400)
    }

    const clientID = extractRelationshipID(existingJob.client)

    if (!clientID || !existingJob.dedupeKey) {
      throw new APIError('Job cannot be reactivated because matching metadata is missing.', 400)
    }

    const matches = await findMatchingJobs({
      clientID,
      dedupeKey: existingJob.dedupeKey,
      excludeID: existingJob.id,
      req,
    })

    const activeDuplicate = matches.docs.find((job: { status?: unknown }) =>
      activeJobStatusSet.has(String(job.status)),
    )

    if (activeDuplicate) {
      throw new APIError(
        `A matching active job already exists (ID: ${activeDuplicate.id}). Reactivation blocked.`,
        409,
      )
    }

    let requestBody: unknown = null

    try {
      requestBody =
        typeof req.json === 'function' ? await req.json() : null
    } catch {
      requestBody = null
    }

    const patchData =
      requestBody &&
      typeof requestBody === 'object' &&
      'data' in requestBody &&
      (requestBody as { data?: unknown }).data &&
      typeof (requestBody as { data?: unknown }).data === 'object'
        ? ((requestBody as { data: Record<string, unknown> }).data as Record<string, unknown>)
        : {}

    const updatedJob = await req.payload.update({
      collection: 'jobs',
      id: existingJob.id,
      data: {
        ...patchData,
        status: 'active',
      },
      overrideAccess: false,
      req,
    })

    return Response.json({
      doc: updatedJob,
      message: 'Job reactivated successfully.',
    })
  },
}

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  access: {
    admin: ({ req }) =>
      hasInternalRole(req.user as InternalUserLike, [
        'admin',
        'leadRecruiter',
        'recruiter',
      ]),
    create: jobsCreateAccess,
    read: jobsReadAccess,
    update: jobsManageAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['jobCode', 'title', 'client', 'status', 'priority', 'openings', 'updatedAt'],
    group: 'Recruitment Ops',
    useAsTitle: 'title',
  },
  endpoints: [reactivateJobEndpoint],
  fields: [
    {
      name: 'jobCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'requisitionTitle',
      type: 'text',
      index: true,
    },
    {
      name: 'businessUnit',
      type: 'text',
      index: true,
    },
    {
      name: 'clientJobID',
      type: 'text',
      index: true,
    },
    {
      name: 'department',
      type: 'text',
      index: true,
    },
    {
      name: 'employmentType',
      type: 'select',
      required: true,
      options: JOB_EMPLOYMENT_TYPE_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'states',
      type: 'text',
      hasMany: true,
    },
    {
      name: 'clientBillRate',
      type: 'text',
    },
    {
      name: 'payRate',
      type: 'text',
    },
    {
      name: 'payType',
      type: 'text',
    },
    {
      name: 'salaryRangeLabel',
      type: 'text',
    },
    {
      name: 'salaryMin',
      type: 'number',
      min: 0,
    },
    {
      name: 'salaryMax',
      type: 'number',
      min: 0,
    },
    {
      name: 'experienceMin',
      type: 'number',
      min: 0,
    },
    {
      name: 'experienceMax',
      type: 'number',
      min: 0,
    },
    {
      name: 'openings',
      type: 'number',
      required: true,
      min: 1,
      defaultValue: 1,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'requiredSkills',
      type: 'array',
      fields: [
        {
          name: 'skill',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'priority',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: JOB_PRIORITY_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: JOB_STATUS_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'targetClosureDate',
      type: 'date',
    },
    {
      name: 'requirementAssignedOn',
      type: 'date',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'recruitmentManager',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'primaryRecruiter',
      type: 'relationship',
      relationTo: 'users',
      filterOptions: {
        role: {
          equals: 'recruiter',
        },
      },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
    {
      name: 'owningHeadRecruiter',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Lead recruiter owning execution for this job.',
      },
      filterOptions: {
        role: {
          equals: 'leadRecruiter',
        },
      },
    },
    {
      name: 'sourceJobRequest',
      type: 'relationship',
      relationTo: 'job-requests',
    },
    {
      name: 'dedupeKey',
      type: 'text',
      index: true,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const dedupeKey = buildJobDedupeKey(getDedupeInput(typedData, typedOriginalDoc))
        const jobCode = await resolveBusinessCode({
          collection: 'jobs',
          data: typedData,
          fieldName: 'jobCode',
          originalDoc: typedOriginalDoc,
          prefix: 'JOB',
          req,
        })

        if (!dedupeKey) {
          return {
            ...typedData,
            jobCode,
          }
        }

        return {
          ...typedData,
          dedupeKey,
          jobCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const user = req.user as InternalUserLike
        const currentUserID = user?.id ?? null

        validateJobRanges(typedData, typedOriginalDoc)

        const clientID = extractRelationshipID(typedData.client ?? typedOriginalDoc?.client)
        const dedupeKey =
          (typedData.dedupeKey as string | undefined) ||
          buildJobDedupeKey(getDedupeInput(typedData, typedOriginalDoc))
        let owningHeadRecruiterID = extractRelationshipID(
          typedData.owningHeadRecruiter ?? typedOriginalDoc?.owningHeadRecruiter,
        )

        if (hasInternalRole(user, ['leadRecruiter']) && !owningHeadRecruiterID) {
          owningHeadRecruiterID = currentUserID
        }

        if (clientID && !owningHeadRecruiterID) {
          const clientDoc = await req.payload.findByID({
            collection: 'clients',
            depth: 0,
            id: clientID,
            overrideAccess: false,
            req,
          })

          owningHeadRecruiterID = extractRelationshipID(clientDoc.owningHeadRecruiter)
        }

        if (!owningHeadRecruiterID) {
          throw new APIError('Owning lead recruiter is required for each job.', 400)
        }

        if (operation === 'create' && req.user?.id) {
          typedData.createdBy = req.user.id
        }

        if (!clientID || !dedupeKey) {
          return typedData
        }

        const matches = await findMatchingJobs({
          clientID,
          dedupeKey,
          excludeID: typedOriginalDoc?.id as number | string | undefined,
          req,
        })

        const activeDuplicate = matches.docs.find((job: { status?: unknown }) =>
          activeJobStatusSet.has(String(job.status)),
        )
        const reactivatableDuplicate = matches.docs.find((job: { status?: unknown }) =>
          reactivatableJobStatusSet.has(String(job.status)),
        )
        const nextStatus = String(typedData.status ?? typedOriginalDoc?.status ?? '')

        if (operation === 'create' && activeDuplicate) {
          throw new APIError(
            `Active duplicate job already exists for this client (ID: ${activeDuplicate.id}).`,
            409,
          )
        }

        if (operation === 'create' && reactivatableDuplicate) {
          throw new APIError(
            `A matching inactive/closed job exists (ID: ${reactivatableDuplicate.id}). Reactivate it instead of creating a duplicate.`,
            409,
          )
        }

        if (operation === 'update' && activeJobStatusSet.has(nextStatus) && activeDuplicate) {
          throw new APIError(
            `Cannot activate this job because matching active job ID ${activeDuplicate.id} already exists.`,
            409,
          )
        }

        return {
          ...typedData,
          dedupeKey,
          jobCode: typedData.jobCode ?? typedOriginalDoc?.jobCode,
          owningHeadRecruiter: owningHeadRecruiterID,
        }
      },
    ],
  },
  indexes: [
    {
      fields: ['jobCode'],
      unique: true,
    },
    {
      fields: ['client', 'dedupeKey'],
    },
    {
      fields: ['status', 'priority'],
    },
    {
      fields: ['status', 'updatedAt'],
    },
    {
      fields: ['owningHeadRecruiter', 'status', 'updatedAt'],
    },
    {
      fields: ['client', 'status', 'updatedAt'],
    },
  ],
}
