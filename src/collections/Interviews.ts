import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { interviewsManageAccess, interviewsReadAccess } from '@/access/visibility'
import {
  type ApplicationStage,
  INTERVIEW_MODE_OPTIONS,
  INTERVIEW_ROUND_OPTIONS,
  INTERVIEW_STATUS_OPTIONS,
  type InterviewStatus,
} from '@/lib/constants/recruitment'
import { resolveBusinessCode } from '@/lib/utils/business-codes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

const toISOOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

const isUpcomingStatus = (status: InterviewStatus): boolean =>
  status === 'scheduled' || status === 'rescheduled' || status === 'completed'

const stageFromInterviewStatus = (status: InterviewStatus): ApplicationStage | null => {
  if (status === 'scheduled' || status === 'rescheduled') {
    return 'interviewScheduled'
  }

  if (status === 'completed') {
    return 'interviewCleared'
  }

  return null
}

export const Interviews: CollectionConfig = {
  slug: 'interviews',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: interviewsManageAccess,
    read: interviewsReadAccess,
    update: interviewsManageAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['interviewCode', 'candidate', 'job', 'interviewRound', 'status', 'startTime', 'updatedAt'],
    group: 'Applications',
    useAsTitle: 'interviewCode',
  },
  fields: [
    {
      name: 'interviewCode',
      type: 'text',
      unique: true,
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
    {
      name: 'job',
      type: 'relationship',
      relationTo: 'jobs',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'recruiter',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'interviewRound',
      type: 'select',
      required: true,
      defaultValue: 'screening',
      options: INTERVIEW_ROUND_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'interviewTemplate',
      type: 'text',
    },
    {
      name: 'interviewerName',
      type: 'text',
      required: true,
    },
    {
      name: 'interviewerEmail',
      type: 'email',
    },
    {
      name: 'clientPOC',
      type: 'text',
    },
    {
      name: 'mode',
      type: 'select',
      required: true,
      defaultValue: 'video',
      options: INTERVIEW_MODE_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'meetingLink',
      type: 'text',
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'timezone',
      type: 'text',
      defaultValue: 'Asia/Kolkata',
    },
    {
      name: 'startTime',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'endTime',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'scheduled',
      index: true,
      options: INTERVIEW_STATUS_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'initiatedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'initiatedOn',
      type: 'date',
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
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined

        const interviewCode = await resolveBusinessCode({
          collection: 'interviews',
          data: typedData,
          fieldName: 'interviewCode',
          originalDoc: typedOriginalDoc,
          prefix: 'INT',
          req,
        })

        return {
          ...typedData,
          interviewCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const user = req.user as InternalUserLike
        const currentUserID = toNumericID(user?.id)

        const applicationID = extractRelationshipID(typedData.application ?? typedOriginalDoc?.application)
        const startTimeISO = toISOOrNull(String(typedData.startTime ?? typedOriginalDoc?.startTime ?? ''))
        const endTimeISO = toISOOrNull(String(typedData.endTime ?? typedOriginalDoc?.endTime ?? ''))

        if (!applicationID) {
          throw new APIError('Application mapping is required for interview scheduling.', 400)
        }

        if (!startTimeISO || !endTimeISO) {
          throw new APIError('Valid start and end time are required.', 400)
        }

        if (new Date(endTimeISO).getTime() <= new Date(startTimeISO).getTime()) {
          throw new APIError('Interview end time must be after start time.', 400)
        }

        const application = await req.payload.findByID({
          collection: 'applications',
          depth: 1,
          id: applicationID,
          overrideAccess: true,
          req,
        })

        const candidateID = extractRelationshipID(application.candidate)
        const jobID = extractRelationshipID(application.job)
        const recruiterID = extractRelationshipID(application.recruiter)
        let clientID: number | string | null = null

        if (jobID) {
          const jobDoc = await req.payload.findByID({
            collection: 'jobs',
            depth: 0,
            id: jobID,
            overrideAccess: true,
            req,
          })
          clientID = extractRelationshipID(jobDoc.client)
        }

        return {
          ...typedData,
          application: applicationID,
          candidate: candidateID ?? undefined,
          client: clientID ?? undefined,
          endTime: endTimeISO,
          initiatedBy:
            operation === 'create' ? typedData.initiatedBy ?? currentUserID ?? undefined : typedOriginalDoc?.initiatedBy,
          initiatedOn:
            operation === 'create'
              ? typedData.initiatedOn ?? new Date().toISOString()
              : typedOriginalDoc?.initiatedOn,
          interviewCode: typedData.interviewCode ?? typedOriginalDoc?.interviewCode,
          job: jobID ?? undefined,
          recruiter: recruiterID ?? undefined,
          startTime: startTimeISO,
        }
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        const applicationID = extractRelationshipID(doc.application)
        const status = String(doc.status || 'scheduled') as InterviewStatus
        const startTimeISO = toISOOrNull(String(doc.startTime || ''))
        const transitionStage = stageFromInterviewStatus(status)

        if (!applicationID || !startTimeISO || !isUpcomingStatus(status)) {
          return doc
        }

        const applicationUpdate: Record<string, unknown> = {
          interviewAt: startTimeISO,
        }

        if (transitionStage) {
          applicationUpdate.stage = transitionStage
          applicationUpdate.latestComment = `Interview ${status} (${doc.interviewRound || 'screening'}) by ${doc.interviewerName || 'team'}.`
        }

        await req.payload.update({
          collection: 'applications',
          data: applicationUpdate,
          id: applicationID,
          overrideAccess: true,
          req,
        })

        return doc
      },
    ],
  },
  indexes: [
    {
      fields: ['interviewCode'],
      unique: true,
    },
    {
      fields: ['application', 'startTime'],
    },
    {
      fields: ['status', 'startTime'],
    },
    {
      fields: ['candidate', 'startTime'],
    },
  ],
}
