import { APIError, type CollectionConfig, type Where } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  applicationsCreateAccess,
  applicationsDeleteAccess,
  applicationsReadAccess,
  applicationsUpdateAccess,
} from '@/access/visibility'
import {
  APPLICATION_STAGES,
  APPLICATION_STAGE_OPTIONS,
  normalizeApplicationStage,
  type ApplicationStage,
} from '@/lib/constants/recruitment'
import { resolveBusinessCode } from '@/lib/utils/business-codes'
import { extractRelationshipID } from '@/lib/utils/relationships'

const DEFAULT_STAGE: ApplicationStage = 'sourced'
const SCREENED_STAGE: ApplicationStage = 'screened'
const SUBMITTED_TO_CLIENT_STAGE: ApplicationStage = 'submittedToClient'
const INTERVIEW_SCHEDULED_STAGE: ApplicationStage = 'interviewScheduled'
const INTERVIEW_CLEARED_STAGE: ApplicationStage = 'interviewCleared'
const OFFER_RELEASED_STAGE: ApplicationStage = 'offerReleased'
const JOINED_STAGE: ApplicationStage = 'joined'
const REJECTED_STAGE: ApplicationStage = 'rejected'

const toNumericID = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  return null
}

const isApplicationStage = (value: unknown): value is ApplicationStage =>
  typeof value === 'string' && APPLICATION_STAGES.includes(value as ApplicationStage)

const normalizeStage = (value: unknown): ApplicationStage => {
  const normalized = normalizeApplicationStage(value)

  if (!normalized || !isApplicationStage(normalized)) {
    throw new APIError('Invalid application stage.', 400)
  }

  return normalized
}

const canRecruiterTransition = (previousStage: ApplicationStage, nextStage: ApplicationStage): boolean => {
  if (previousStage === nextStage) {
    return true
  }

  if (previousStage === SCREENED_STAGE && nextStage === SUBMITTED_TO_CLIENT_STAGE) return true
  if (previousStage === SUBMITTED_TO_CLIENT_STAGE && (nextStage === INTERVIEW_SCHEDULED_STAGE || nextStage === REJECTED_STAGE))
    return true
  if (previousStage === INTERVIEW_SCHEDULED_STAGE && (nextStage === INTERVIEW_CLEARED_STAGE || nextStage === REJECTED_STAGE))
    return true
  if (previousStage === INTERVIEW_CLEARED_STAGE && (nextStage === OFFER_RELEASED_STAGE || nextStage === REJECTED_STAGE))
    return true
  if (previousStage === OFFER_RELEASED_STAGE && (nextStage === JOINED_STAGE || nextStage === REJECTED_STAGE))
    return true

  return false
}

const canLeadTransition = (previousStage: ApplicationStage, nextStage: ApplicationStage): boolean => {
  if (previousStage === nextStage) {
    return true
  }

  if (canRecruiterTransition(previousStage, nextStage)) {
    return true
  }

  if (previousStage === DEFAULT_STAGE && (nextStage === SCREENED_STAGE || nextStage === REJECTED_STAGE)) {
    return true
  }

  if (previousStage === SCREENED_STAGE && nextStage === DEFAULT_STAGE) {
    return true
  }

  return false
}

const validateStageTransition = ({
  nextStage,
  operation,
  previousStage,
  user,
}: {
  nextStage: ApplicationStage
  operation: 'create' | 'update'
  previousStage: ApplicationStage | null
  user: InternalUserLike
}) => {
  if (hasInternalRole(user, ['admin'])) {
    return
  }

  if (operation === 'create') {
    if (hasInternalRole(user, ['leadRecruiter', 'recruiter']) && nextStage === DEFAULT_STAGE) {
      return
    }

    throw new APIError('Applications can only be created in Sourced stage.', 403)
  }

  if (!previousStage) {
    throw new APIError('Previous application stage is required for transition.', 400)
  }

  if (hasInternalRole(user, ['recruiter'])) {
    if (!canRecruiterTransition(previousStage, nextStage)) {
      throw new APIError(
        'Recruiter can move applications only after lead screening through client submission, interview, offer, join/reject flow.',
        403,
      )
    }

    return
  }

  if (hasInternalRole(user, ['leadRecruiter'])) {
    if (!canLeadTransition(previousStage, nextStage)) {
      throw new APIError('Lead Recruiter can screen sourced candidates and manage full downstream application flow.', 403)
    }

    return
  }

  throw new APIError('This role cannot change application stage.', 403)
}

export const Applications: CollectionConfig = {
  slug: 'applications',
  access: {
    admin: ({ req }) =>
      hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: applicationsCreateAccess,
    read: applicationsReadAccess,
    update: applicationsUpdateAccess,
    delete: applicationsDeleteAccess,
  },
  admin: {
    defaultColumns: ['applicationCode', 'candidate', 'job', 'recruiter', 'stage', 'updatedAt'],
    group: 'Applications',
    useAsTitle: 'candidate',
  },
  fields: [
    {
      name: 'applicationCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'candidate',
      type: 'relationship',
      relationTo: 'candidates',
      required: true,
      index: true,
    },
    {
      name: 'job',
      type: 'relationship',
      relationTo: 'jobs',
      required: true,
      index: true,
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
      name: 'candidateAccount',
      type: 'relationship',
      relationTo: 'candidate-users',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'stage',
      type: 'select',
      required: true,
      defaultValue: DEFAULT_STAGE,
      index: true,
      options: APPLICATION_STAGE_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'latestComment',
      type: 'textarea',
    },
    {
      name: 'pipelineSource',
      type: 'text',
    },
    {
      name: 'submissionType',
      type: 'text',
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
      name: 'submittedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'sourcedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'screenedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'submittedToClientAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'interviewScheduledAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'interviewClearedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'offerReleasedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'joinedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'rejectedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'clientSubmittedAt',
      type: 'date',
    },
    {
      name: 'interviewAt',
      type: 'date',
    },
    {
      name: 'confirmedAt',
      type: 'date',
    },
    {
      name: 'placedAt',
      type: 'date',
    },
    {
      name: 'notJoinedAt',
      type: 'date',
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'candidateInvitedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'candidateAppliedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const user = req.user as InternalUserLike
        const currentUserID = toNumericID(user?.id)
        const applicationCode = await resolveBusinessCode({
          collection: 'applications',
          data: typedData,
          fieldName: 'applicationCode',
          originalDoc: typedOriginalDoc,
          prefix: 'APP',
          req,
        })

        if (operation !== 'create') {
          return {
            ...typedData,
            applicationCode,
          }
        }

        if (hasInternalRole(user, ['recruiter']) && currentUserID !== null) {
          typedData.recruiter = currentUserID
        }

        if (!typedData.stage) {
          typedData.stage = DEFAULT_STAGE
        }

        if (currentUserID !== null && !typedData.createdBy) {
          typedData.createdBy = currentUserID
        }

        return {
          ...typedData,
          applicationCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginalDoc = originalDoc as Record<string, unknown> | undefined
        const user = req.user as InternalUserLike
        const currentUserID = toNumericID(user?.id)
        const candidateID = toNumericID(extractRelationshipID(typedData.candidate ?? typedOriginalDoc?.candidate))
        const jobID = toNumericID(extractRelationshipID(typedData.job ?? typedOriginalDoc?.job))
        const recruiterID = toNumericID(extractRelationshipID(typedData.recruiter ?? typedOriginalDoc?.recruiter))
        const candidateAccountID = toNumericID(
          extractRelationshipID(typedData.candidateAccount ?? typedOriginalDoc?.candidateAccount),
        )
        const previousStage = typedOriginalDoc ? normalizeStage(typedOriginalDoc.stage ?? DEFAULT_STAGE) : null
        const nextStage = normalizeStage(typedData.stage ?? typedOriginalDoc?.stage ?? DEFAULT_STAGE)
        const stageChanged = operation === 'create' || previousStage !== nextStage

        if (!candidateID || !jobID || !recruiterID) {
          throw new APIError('Candidate, job, and recruiter are required for application mapping.', 400)
        }

        if (!req.context?.skipStageTransitionValidation) {
          validateStageTransition({
            nextStage,
            operation,
            previousStage,
            user,
          })
        }

        const andConditions: Where[] = [
          {
            candidate: {
              equals: candidateID,
            },
          },
          {
            job: {
              equals: jobID,
            },
          },
        ]

        if (operation === 'update' && typedOriginalDoc?.id) {
          andConditions.push({
            id: {
              not_equals: typedOriginalDoc.id,
            },
          })
        }

        const duplicate = await req.payload.find({
          collection: 'applications',
          depth: 0,
          limit: 1,
          overrideAccess: true,
          req,
          where: {
            and: andConditions,
          },
        })

        if (duplicate.totalDocs > 0) {
          throw new APIError('Application already exists for this candidate and job.', 409)
        }

        const transitionCommentOverride =
          typeof req.context?.applicationStageCommentOverride === 'string'
            ? req.context.applicationStageCommentOverride.trim() || null
            : null
        const transitionComment =
          transitionCommentOverride ?? (String(typedData.latestComment || '').trim() || null)

        if (operation === 'create') {
          req.context = {
            ...req.context,
            applicationStageTransition: {
              changed: true,
              comment: transitionComment,
              fromStage: null,
              toStage: nextStage,
            },
          }
        }

        if (operation === 'update' && previousStage !== nextStage) {
          req.context = {
            ...req.context,
            applicationStageTransition: {
              changed: true,
              comment: transitionComment,
              fromStage: previousStage,
              toStage: nextStage,
            },
          }
        }

        const isSourced = stageChanged && nextStage === DEFAULT_STAGE
        const isScreened = stageChanged && nextStage === SCREENED_STAGE
        const isSubmittedToClient = stageChanged && nextStage === SUBMITTED_TO_CLIENT_STAGE
        const isInterviewScheduled = stageChanged && nextStage === INTERVIEW_SCHEDULED_STAGE
        const isInterviewCleared = stageChanged && nextStage === INTERVIEW_CLEARED_STAGE
        const isOfferReleased = stageChanged && nextStage === OFFER_RELEASED_STAGE
        const isJoined = stageChanged && nextStage === JOINED_STAGE
        const isRejected = stageChanged && nextStage === REJECTED_STAGE
        const isLeadReviewDecision =
          stageChanged && (nextStage === SCREENED_STAGE || nextStage === REJECTED_STAGE)
        const nowISO = new Date().toISOString()

        return {
          ...typedData,
          applicationCode: typedData.applicationCode ?? typedOriginalDoc?.applicationCode,
          candidate: candidateID,
          candidateAccount: candidateAccountID ?? undefined,
          candidateAppliedAt: isJoined ? nowISO : typedOriginalDoc?.candidateAppliedAt,
          candidateInvitedAt: isInterviewScheduled ? nowISO : typedOriginalDoc?.candidateInvitedAt,
          createdBy: typedData.createdBy ?? typedOriginalDoc?.createdBy ?? currentUserID ?? undefined,
          clientSubmittedAt: isSubmittedToClient ? nowISO : typedOriginalDoc?.clientSubmittedAt,
          confirmedAt: isInterviewCleared ? nowISO : typedOriginalDoc?.confirmedAt,
          interviewAt: isInterviewScheduled ? nowISO : typedOriginalDoc?.interviewAt,
          interviewClearedAt: isInterviewCleared ? nowISO : typedOriginalDoc?.interviewClearedAt,
          interviewScheduledAt: isInterviewScheduled ? nowISO : typedOriginalDoc?.interviewScheduledAt,
          job: jobID,
          joinedAt: isJoined ? nowISO : typedOriginalDoc?.joinedAt,
          notJoinedAt: isRejected ? nowISO : typedOriginalDoc?.notJoinedAt,
          offerReleasedAt: isOfferReleased ? nowISO : typedOriginalDoc?.offerReleasedAt,
          placedAt: isJoined ? nowISO : typedOriginalDoc?.placedAt,
          rejectedAt: isRejected ? nowISO : typedOriginalDoc?.rejectedAt,
          recruiter: recruiterID,
          reviewedAt: isLeadReviewDecision ? nowISO : typedOriginalDoc?.reviewedAt,
          reviewedBy: isLeadReviewDecision
            ? currentUserID ?? typedOriginalDoc?.reviewedBy
            : typedOriginalDoc?.reviewedBy,
          screenedAt: isScreened ? nowISO : typedOriginalDoc?.screenedAt,
          sourcedAt: isSourced ? nowISO : typedOriginalDoc?.sourcedAt,
          stage: nextStage,
          submittedAt: isSubmittedToClient ? nowISO : typedOriginalDoc?.submittedAt,
          submittedToClientAt: isSubmittedToClient ? nowISO : typedOriginalDoc?.submittedToClientAt,
        }
      },
    ],
    afterChange: [
      async ({ doc, operation, req, context }) => {
        const stageTransition = context.applicationStageTransition as
          | {
              changed?: boolean
              comment?: string | null
              fromStage?: ApplicationStage | null
              toStage?: ApplicationStage | null
            }
          | undefined

        if (!stageTransition?.changed) {
          return doc
        }

        const applicationID = toNumericID(doc.id)
        const candidateID = toNumericID(extractRelationshipID(doc.candidate))
        const jobID = toNumericID(extractRelationshipID(doc.job))
        const recruiterID = toNumericID(extractRelationshipID(doc.recruiter))
        const candidateAccountID = toNumericID(extractRelationshipID(doc.candidateAccount))
        const actorID = toNumericID(req.user?.id)

        if (!applicationID || !candidateID || !jobID || !recruiterID || !stageTransition.toStage) {
          throw new APIError('Unable to persist application stage history due to missing linkage fields.', 500)
        }

        await req.payload.create({
          collection: 'application-stage-history',
          data: {
            actor: actorID ?? undefined,
            application: applicationID,
            candidate: candidateID,
            candidateAccount: candidateAccountID ?? undefined,
            changedAt: new Date().toISOString(),
            comment: stageTransition.comment || undefined,
            fromStage: stageTransition.fromStage || undefined,
            job: jobID,
            recruiter: recruiterID,
            toStage: stageTransition.toStage,
          },
          overrideAccess: true,
          req,
        })

        return doc
      },
    ],
  },
  indexes: [
    {
      fields: ['applicationCode'],
      unique: true,
    },
    {
      fields: ['candidate', 'job'],
      unique: true,
    },
    {
      fields: ['job', 'stage'],
    },
    {
      fields: ['candidateAccount', 'stage'],
    },
    {
      fields: ['stage', 'updatedAt'],
    },
    {
      fields: ['recruiter', 'stage', 'updatedAt'],
    },
  ],
}
