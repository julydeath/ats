import { APIError, type CollectionConfig, type Endpoint } from 'payload'

import {
  adminOrHeadRecruiterAccess,
  adminOrHeadRecruiterAdminAccess,
  canManageInternalUsers,
  type InternalUserLike,
} from '@/access/internalRoles'
import {
  ACTIVE_JOB_STATUSES,
  JOB_EMPLOYMENT_TYPE_OPTIONS,
  JOB_PRIORITY_OPTIONS,
  JOB_REQUEST_SOURCE_OPTIONS,
  JOB_REQUEST_STATUS_OPTIONS,
  REACTIVATABLE_JOB_STATUSES,
} from '@/lib/constants/recruitment'
import { buildJobDedupeKey } from '@/lib/jobs/dedupe'
import { compactWhitespace } from '@/lib/utils/normalization'
import { extractRelationshipID } from '@/lib/utils/relationships'

const terminalStatuses = new Set([
  'approved',
  'rejected',
  'converted',
  'duplicateActive',
  'reactivated',
])
const activeJobStatusSet = new Set<string>(ACTIVE_JOB_STATUSES)
const reactivatableJobStatusSet = new Set<string>(REACTIVATABLE_JOB_STATUSES)

const getProposedSkills = (proposedSkills: unknown): { skill: string }[] => {
  if (!Array.isArray(proposedSkills)) {
    return []
  }

  return proposedSkills
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return ''
      }

      const typed = row as { skill?: unknown }
      return compactWhitespace(typed.skill)
    })
    .filter(Boolean)
    .map((skill) => ({ skill }))
}

const processJobRequestEndpoint: Endpoint = {
  path: '/:id/process',
  method: 'post',
  handler: async (req) => {
    if (!canManageInternalUsers(req.user as InternalUserLike)) {
      throw new APIError('Forbidden', 403)
    }

    const routeID = req.routeParams?.id
    const requestID = typeof routeID === 'number' || typeof routeID === 'string' ? routeID : null

    if (!requestID) {
      throw new APIError('Job request ID is required.', 400)
    }

    const jobRequest = await req.payload.findByID({
      collection: 'job-requests',
      id: requestID,
      depth: 0,
      overrideAccess: false,
      req,
    })

    let body: unknown = null

    try {
      body = typeof req.json === 'function' ? await req.json() : null
    } catch {
      body = null
    }

    const overrides =
      body &&
      typeof body === 'object' &&
      'data' in body &&
      (body as { data?: unknown }).data &&
      typeof (body as { data?: unknown }).data === 'object'
        ? ((body as { data: Record<string, unknown> }).data as Record<string, unknown>)
        : {}

    const clientValue = overrides.client ?? jobRequest.client
    const clientID = extractRelationshipID(clientValue)

    if (!clientID) {
      throw new APIError(
        'Client is required to process this intake. Link an existing client before processing.',
        400,
      )
    }

    const requiredSkills =
      overrides.requiredSkills && Array.isArray(overrides.requiredSkills)
        ? (overrides.requiredSkills as { skill: string }[])
        : getProposedSkills(jobRequest.proposedRequiredSkills)

    const intakeTitle = compactWhitespace(overrides.title ?? jobRequest.proposedTitle)
    const intakeDescription = compactWhitespace(overrides.description ?? jobRequest.proposedDescription)

    if (!intakeTitle || !intakeDescription) {
      throw new APIError('Job title and description are required to process intake.', 400)
    }

    const baseJobData: Record<string, unknown> = {
      client: clientID,
      title: intakeTitle,
      department: compactWhitespace(overrides.department ?? jobRequest.proposedDepartment) || null,
      employmentType: overrides.employmentType ?? jobRequest.proposedEmploymentType,
      location: compactWhitespace(overrides.location ?? jobRequest.proposedLocation) || null,
      salaryMin: overrides.salaryMin ?? jobRequest.proposedSalaryMin,
      salaryMax: overrides.salaryMax ?? jobRequest.proposedSalaryMax,
      experienceMin: overrides.experienceMin ?? jobRequest.proposedExperienceMin,
      experienceMax: overrides.experienceMax ?? jobRequest.proposedExperienceMax,
      openings: overrides.openings ?? jobRequest.proposedOpenings ?? 1,
      description: intakeDescription,
      requiredSkills,
      priority: overrides.priority ?? jobRequest.priority ?? 'medium',
      owningHeadRecruiter: overrides.owningHeadRecruiter ?? jobRequest.owningHeadRecruiter ?? null,
      sourceJobRequest: jobRequest.id,
    }

    if (!baseJobData.employmentType) {
      throw new APIError(
        'Employment type is required to convert intake into a job. Provide it before processing.',
        400,
      )
    }

    const dedupeKey = buildJobDedupeKey({
      client: baseJobData.client,
      department: baseJobData.department,
      description: baseJobData.description,
      employmentType: baseJobData.employmentType,
      location: baseJobData.location,
      requiredSkills: baseJobData.requiredSkills,
      title: baseJobData.title,
    })

    if (!dedupeKey) {
      throw new APIError('Unable to process request because dedupe key could not be generated.', 400)
    }

    const matches = await req.payload.find({
      collection: 'jobs',
      where: {
        and: [
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
        ],
      },
      depth: 0,
      limit: 20,
      overrideAccess: false,
      req,
    })

    const activeDuplicate = matches.docs.find((job: { status?: unknown }) =>
      activeJobStatusSet.has(String(job.status)),
    )
    const reactivatableDuplicate = matches.docs.find((job: { status?: unknown }) =>
      reactivatableJobStatusSet.has(String(job.status)),
    )

    if (activeDuplicate) {
      const updatedRequest = await req.payload.update({
        collection: 'job-requests',
        id: jobRequest.id,
        data: {
          linkedJob: activeDuplicate.id,
          notes:
            compactWhitespace(jobRequest.notes) ||
            'Intake matches an already active job for the same client.',
          status: 'duplicateActive',
        },
        overrideAccess: false,
        req,
      })

      return Response.json({
        job: activeDuplicate,
        jobRequest: updatedRequest,
        outcome: 'duplicateActive',
      })
    }

    if (reactivatableDuplicate) {
      const reactivatedJob = await req.payload.update({
        collection: 'jobs',
        id: reactivatableDuplicate.id,
        data: {
          ...baseJobData,
          status: 'active',
        },
        overrideAccess: false,
        req,
      })

      const updatedRequest = await req.payload.update({
        collection: 'job-requests',
        id: jobRequest.id,
        data: {
          linkedJob: reactivatedJob.id,
          notes:
            compactWhitespace(jobRequest.notes) ||
            'Reactivated matching inactive/closed job from intake processing.',
          status: 'reactivated',
        },
        overrideAccess: false,
        req,
      })

      return Response.json({
        job: reactivatedJob,
        jobRequest: updatedRequest,
        outcome: 'reactivated',
      })
    }

    const createdJob = await req.payload.create({
      collection: 'jobs',
      data: {
        ...baseJobData,
        status: 'active',
      } as any,
      overrideAccess: false,
      req,
    })

    const updatedRequest = await req.payload.update({
      collection: 'job-requests',
      id: jobRequest.id,
      data: {
        linkedJob: createdJob.id,
        status: 'converted',
      },
      overrideAccess: false,
      req,
    })

    return Response.json({
      job: createdJob,
      jobRequest: updatedRequest,
      outcome: 'created',
    })
  },
}

export const JobRequests: CollectionConfig = {
  slug: 'job-requests',
  access: {
    admin: adminOrHeadRecruiterAdminAccess,
    create: adminOrHeadRecruiterAccess,
    read: adminOrHeadRecruiterAccess,
    update: adminOrHeadRecruiterAccess,
    delete: adminOrHeadRecruiterAccess,
  },
  admin: {
    defaultColumns: ['subject', 'client', 'status', 'intakeSource', 'receivedAt', 'processedBy'],
    group: 'Recruitment Ops',
    useAsTitle: 'subject',
  },
  endpoints: [processJobRequestEndpoint],
  fields: [
    {
      name: 'intakeSource',
      type: 'select',
      required: true,
      defaultValue: 'email',
      options: JOB_REQUEST_SOURCE_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      index: true,
    },
    {
      name: 'clientName',
      type: 'text',
      admin: {
        description: 'Use when client does not exist yet in the clients master.',
      },
    },
    {
      name: 'contactPerson',
      type: 'text',
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'contactPhone',
      type: 'text',
    },
    {
      name: 'proposedTitle',
      type: 'text',
    },
    {
      name: 'proposedDepartment',
      type: 'text',
    },
    {
      name: 'proposedEmploymentType',
      type: 'select',
      options: JOB_EMPLOYMENT_TYPE_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'proposedLocation',
      type: 'text',
    },
    {
      name: 'proposedSalaryMin',
      type: 'number',
      min: 0,
    },
    {
      name: 'proposedSalaryMax',
      type: 'number',
      min: 0,
    },
    {
      name: 'proposedExperienceMin',
      type: 'number',
      min: 0,
    },
    {
      name: 'proposedExperienceMax',
      type: 'number',
      min: 0,
    },
    {
      name: 'proposedOpenings',
      type: 'number',
      min: 1,
      defaultValue: 1,
    },
    {
      name: 'proposedDescription',
      type: 'textarea',
    },
    {
      name: 'proposedRequiredSkills',
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
      defaultValue: 'medium',
      options: JOB_PRIORITY_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: JOB_REQUEST_STATUS_OPTIONS.map((option) => ({ ...option })),
      index: true,
    },
    {
      name: 'linkedJob',
      type: 'relationship',
      relationTo: 'jobs',
    },
    {
      name: 'owningHeadRecruiter',
      type: 'relationship',
      relationTo: 'users',
      filterOptions: {
        role: {
          equals: 'headRecruiter',
        },
      },
    },
    {
      name: 'receivedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
    },
    {
      name: 'processedBy',
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
      async ({ data, originalDoc }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined

        const client = extractRelationshipID(typedData.client ?? typedOriginalDoc?.client)
        const clientName = compactWhitespace(typedData.clientName ?? typedOriginalDoc?.clientName)

        if (!client && !clientName) {
          throw new APIError('Either an existing client or client name is required for intake.', 400)
        }

        return {
          ...typedData,
          clientName: clientName || null,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const previousStatus = String(originalDoc?.status || '')
        const nextStatus = String(typedData.status ?? previousStatus)

        if (operation === 'create' && !typedData.receivedAt) {
          typedData.receivedAt = new Date().toISOString()
        }

        if (operation === 'update' && nextStatus !== previousStatus && terminalStatuses.has(nextStatus)) {
          typedData.processedBy = req.user?.id || null
        }

        return typedData
      },
    ],
  },
}
