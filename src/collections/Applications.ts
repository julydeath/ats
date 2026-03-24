import { APIError, type CollectionConfig, type Where } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import {
  applicationsCreateAccess,
  applicationsDeleteAccess,
  applicationsReadAccess,
  applicationsUpdateAccess,
} from '@/access/visibility'
import { buildCandidateInviteExpiryDate, generateCandidateInviteToken } from '@/lib/auth/candidate-invites'
import { getLeadVisibleJobIDs, getRecruiterAssignedJobIDs } from '@/lib/assignments/selectors'
import { APPLICATION_STAGES, APPLICATION_STAGE_OPTIONS, type ApplicationStage } from '@/lib/constants/recruitment'
import { buildCandidateInviteLink, sendCandidateInviteEmail } from '@/lib/email/resend'
import { extractRelationshipID } from '@/lib/utils/relationships'

const DEFAULT_STAGE: ApplicationStage = 'sourcedByRecruiter'
const INTERNAL_REVIEW_PENDING_STAGE: ApplicationStage = 'internalReviewPending'
const INTERNAL_REVIEW_APPROVED_STAGE: ApplicationStage = 'internalReviewApproved'
const CANDIDATE_INVITED_STAGE: ApplicationStage = 'candidateInvited'
const CANDIDATE_APPLIED_STAGE: ApplicationStage = 'candidateApplied'

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
  if (!isApplicationStage(value)) {
    throw new APIError('Invalid application stage.', 400)
  }

  return value
}

const canRecruiterTransition = (previousStage: ApplicationStage, nextStage: ApplicationStage): boolean => {
  if (previousStage === nextStage) {
    return true
  }

  if (
    (previousStage === 'sourcedByRecruiter' || previousStage === 'sentBackForCorrection') &&
    nextStage === 'internalReviewPending'
  ) {
    return true
  }

  if (
    ['internalReviewApproved', 'candidateInvited', 'candidateApplied'].includes(previousStage) &&
    ['internalReviewApproved', 'candidateInvited', 'candidateApplied'].includes(nextStage)
  ) {
    return true
  }

  return false
}

const canLeadTransition = (previousStage: ApplicationStage, nextStage: ApplicationStage): boolean => {
  if (previousStage === nextStage) {
    return true
  }

  if (canRecruiterTransition(previousStage, nextStage)) {
    return true
  }

  return (
    previousStage === 'internalReviewPending' &&
    (nextStage === 'internalReviewApproved' ||
      nextStage === 'internalReviewRejected' ||
      nextStage === 'sentBackForCorrection')
  )
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
    if (hasInternalRole(user, ['recruiter', 'leadRecruiter'])) {
      if (nextStage !== 'sourcedByRecruiter' && nextStage !== 'internalReviewPending') {
        throw new APIError('Recruiter/Lead can only create applications as sourced or pending review.', 403)
      }

      return
    }

    throw new APIError('Only recruiter, lead recruiter, or admin can create applications.', 403)
  }

  if (!previousStage) {
    throw new APIError('Previous application stage is required for transition.', 400)
  }

  if (hasInternalRole(user, ['recruiter'])) {
    if (!canRecruiterTransition(previousStage, nextStage)) {
      throw new APIError(
        'Recruiter can submit sourced/corrected applications for review and update post-approval pipeline stages.',
        403,
      )
    }

    return
  }

  if (hasInternalRole(user, ['leadRecruiter'])) {
    if (!canLeadTransition(previousStage, nextStage)) {
      throw new APIError('Lead Recruiter can only review pending applications.', 403)
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
    defaultColumns: ['candidate', 'job', 'recruiter', 'stage', 'updatedAt'],
    group: 'Applications',
    useAsTitle: 'candidate',
  },
  fields: [
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
      name: 'submittedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
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
      async ({ data, operation, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const user = req.user as InternalUserLike
        const currentUserID = toNumericID(user?.id)

        if (operation !== 'create') {
          return typedData
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

        return typedData
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
        const leadRecruiterID = toNumericID(user?.id)
        const previousStage = typedOriginalDoc ? normalizeStage(typedOriginalDoc.stage ?? DEFAULT_STAGE) : null
        const nextStage = normalizeStage(typedData.stage ?? typedOriginalDoc?.stage ?? DEFAULT_STAGE)
        const stageChanged = operation === 'create' || previousStage !== nextStage

        if (!candidateID || !jobID || !recruiterID) {
          throw new APIError('Candidate, job, and recruiter are required for application mapping.', 400)
        }

        if (hasInternalRole(user, ['recruiter']) && String(recruiterID) !== String(currentUserID)) {
          throw new APIError('Recruiter can create/update only their own applications.', 403)
        }

        if (hasInternalRole(user, ['recruiter'])) {
          const assignedJobIDs = await getRecruiterAssignedJobIDs({
            recruiterID,
            req,
          })
          const isAssignedJob = assignedJobIDs.some((assignedJobID) => String(assignedJobID) === String(jobID))

          if (!isAssignedJob) {
            throw new APIError('Recruiter can create applications only under assigned jobs.', 403)
          }
        }

        if (hasInternalRole(user, ['leadRecruiter'])) {
          if (!leadRecruiterID) {
            throw new APIError('Lead Recruiter context is missing on this request.', 401)
          }

          const visibleJobIDs = await getLeadVisibleJobIDs({
            leadRecruiterID,
            req,
          })
          const canReviewJob = visibleJobIDs.some((visibleJobID) => String(visibleJobID) === String(jobID))

          if (!canReviewJob) {
            throw new APIError('Lead Recruiter can review applications only under assigned jobs.', 403)
          }
        }

        if (!req.context?.skipStageTransitionValidation) {
          validateStageTransition({
            nextStage,
            operation,
            previousStage,
            user,
          })
        }

        if (stageChanged && nextStage === INTERNAL_REVIEW_APPROVED_STAGE) {
          const candidate = await req.payload.findByID({
            collection: 'candidates',
            depth: 0,
            id: candidateID,
            overrideAccess: true,
            req,
          })
          const candidateEmail = String(candidate.email || '').trim()

          if (!candidateEmail) {
            throw new APIError(
              'Candidate email is required before internal approval so invite delivery can be completed.',
              400,
            )
          }
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

        const isSubmission = stageChanged && nextStage === INTERNAL_REVIEW_PENDING_STAGE
        const isLeadReviewDecision =
          stageChanged &&
          (nextStage === INTERNAL_REVIEW_APPROVED_STAGE ||
            nextStage === 'internalReviewRejected' ||
            nextStage === 'sentBackForCorrection')
        const isCandidateInvited = stageChanged && nextStage === CANDIDATE_INVITED_STAGE
        const isCandidateApplied = stageChanged && nextStage === CANDIDATE_APPLIED_STAGE
        const nowISO = new Date().toISOString()

        return {
          ...typedData,
          candidate: candidateID,
          candidateAccount: candidateAccountID ?? undefined,
          candidateAppliedAt: isCandidateApplied ? nowISO : typedOriginalDoc?.candidateAppliedAt,
          candidateInvitedAt: isCandidateInvited ? nowISO : typedOriginalDoc?.candidateInvitedAt,
          createdBy: typedData.createdBy ?? typedOriginalDoc?.createdBy ?? currentUserID ?? undefined,
          job: jobID,
          recruiter: recruiterID,
          reviewedAt: isLeadReviewDecision ? nowISO : typedOriginalDoc?.reviewedAt,
          reviewedBy: isLeadReviewDecision
            ? currentUserID ?? typedOriginalDoc?.reviewedBy
            : typedOriginalDoc?.reviewedBy,
          stage: nextStage,
          submittedAt: isSubmission ? nowISO : typedOriginalDoc?.submittedAt,
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

        const shouldDispatchInvite =
          operation === 'update' &&
          stageTransition.toStage === INTERNAL_REVIEW_APPROVED_STAGE &&
          !context.skipCandidateInviteDispatch

        if (!shouldDispatchInvite) {
          return doc
        }

        const [candidate, job] = await Promise.all([
          req.payload.findByID({
            collection: 'candidates',
            depth: 0,
            id: candidateID,
            overrideAccess: true,
            req,
          }),
          req.payload.findByID({
            collection: 'jobs',
            depth: 0,
            id: jobID,
            overrideAccess: true,
            req,
          }),
        ])

        const candidateName = String(candidate.fullName || '').trim() || 'Candidate'
        const inviteEmail = String(candidate.email || '').trim()
        const jobTitle = String(job.title || '').trim() || `Job #${jobID}`

        if (!inviteEmail) {
          throw new APIError('Candidate email is required for invite dispatch.', 400)
        }

        const nowISO = new Date().toISOString()

        const pendingInvites = await req.payload.find({
          collection: 'candidate-invites',
          depth: 0,
          limit: 100,
          overrideAccess: true,
          req,
          where: {
            and: [
              {
                application: {
                  equals: applicationID,
                },
              },
              {
                status: {
                  equals: 'pending',
                },
              },
            ],
          },
        })

        for (const pendingInvite of pendingInvites.docs) {
          await req.payload.update({
            collection: 'candidate-invites',
            data: {
              revokedAt: nowISO,
              status: 'revoked',
            },
            id: pendingInvite.id,
            overrideAccess: true,
            req,
          })
        }

        const { token, tokenHash } = generateCandidateInviteToken()
        const expiresAt = buildCandidateInviteExpiryDate().toISOString()

        await req.payload.create({
          collection: 'candidate-invites',
          data: {
            application: applicationID,
            candidate: candidateID,
            expiresAt,
            inviteEmail,
            sentAt: nowISO,
            sentBy: actorID ?? undefined,
            status: 'pending',
            tokenHash,
          },
          overrideAccess: true,
          req,
        })

        await sendCandidateInviteEmail({
          candidateName,
          expiresAtISO: expiresAt,
          inviteLink: buildCandidateInviteLink(token),
          jobTitle,
          to: inviteEmail,
        })

        await req.payload.update({
          collection: 'applications',
          context: {
            applicationStageCommentOverride: 'Candidate invite email sent.',
            skipCandidateInviteDispatch: true,
            skipStageTransitionValidation: true,
          },
          data: {
            stage: CANDIDATE_INVITED_STAGE,
          },
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
