import { APIError, type CollectionConfig } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { leaveRequestManageAccess, leaveRequestReadAccess } from '@/access/hr'
import {
  LEAVE_REQUEST_STATUS_OPTIONS,
  LEAVE_UNITS,
  LEAVE_UNIT_OPTIONS,
  type LeaveRequestStatus,
} from '@/lib/constants/hr'
import { isInternalRole, type InternalRole } from '@/lib/constants/roles'
import { applyApprovedLeaveToAttendance, computeLeaveDays } from '@/lib/hr/leave'
import {
  LEAVE_WORKFLOW_ACTIONS,
  LEAVE_WORKFLOW_ACTION_LABELS,
  resolveLeaveWorkflowAction,
  type LeaveWorkflowAction,
} from '@/lib/hr/leave-workflow'
import { readRelationID } from '@/lib/hr/common'
import { resolveBusinessCode } from '@/lib/utils/business-codes'
import type { EmployeeProfile, User } from '@/payload-types'

type LeaveWorkflowActionContext = {
  action: LeaveWorkflowAction
  comment?: string | null
  overrideReason?: string | null
}

const isLeaveStatus = (value: unknown): value is LeaveRequestStatus =>
  typeof value === 'string' &&
  ['pendingLeadApproval', 'pendingAdminApproval', 'approved', 'rejected', 'cancelled'].includes(value)

const normalizeEmployeeRole = (value: unknown): InternalRole => {
  if (typeof value === 'string' && isInternalRole(value)) {
    return value
  }

  return 'recruiter'
}

const readActionContext = (context: unknown): LeaveWorkflowActionContext | null => {
  if (!context || typeof context !== 'object') return null

  const typed = context as {
    action?: unknown
    comment?: unknown
    overrideReason?: unknown
  }

  const action = typed.action
  if (typeof action !== 'string' || !LEAVE_WORKFLOW_ACTIONS.includes(action as LeaveWorkflowAction)) {
    return null
  }

  const comment = typeof typed.comment === 'string' ? typed.comment.trim() : null
  const overrideReason = typeof typed.overrideReason === 'string' ? typed.overrideReason.trim() : null

  return {
    action: action as LeaveWorkflowAction,
    comment,
    overrideReason,
  }
}

const inferLegacyAction = ({
  actorRole,
  isRequester,
  nextStatus,
  previousStatus,
}: {
  actorRole: InternalRole
  isRequester: boolean
  nextStatus: LeaveRequestStatus
  previousStatus: LeaveRequestStatus
}): LeaveWorkflowAction | null => {
  if (nextStatus === 'cancelled' && isRequester) {
    return 'cancel'
  }

  if (actorRole === 'leadRecruiter' && previousStatus === 'pendingLeadApproval' && nextStatus === 'pendingAdminApproval') {
    return 'leadApprove'
  }

  if (actorRole === 'admin' && previousStatus === 'pendingAdminApproval' && nextStatus === 'approved') {
    return 'adminApprove'
  }

  if (actorRole === 'admin' && previousStatus === 'pendingLeadApproval' && nextStatus === 'approved') {
    return 'adminOverrideApprove'
  }

  if (
    (actorRole === 'leadRecruiter' && previousStatus === 'pendingLeadApproval' && nextStatus === 'rejected') ||
    (actorRole === 'admin' && ['pendingLeadApproval', 'pendingAdminApproval'].includes(previousStatus) && nextStatus === 'rejected')
  ) {
    return 'reject'
  }

  return null
}

export const LeaveRequests: CollectionConfig = {
  slug: 'leave-requests',
  access: {
    admin: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter']),
    create: leaveRequestManageAccess,
    read: leaveRequestReadAccess,
    update: leaveRequestManageAccess,
    delete: ({ req }) => hasInternalRole(req.user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['leaveRequestCode', 'employee', 'leaveType', 'startDate', 'endDate', 'totalDays', 'status'],
    group: 'HRMS',
    useAsTitle: 'leaveRequestCode',
  },
  fields: [
    {
      name: 'leaveRequestCode',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'employee',
      type: 'relationship',
      relationTo: 'employee-profiles',
      required: true,
      index: true,
    },
    {
      name: 'employeeRole',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'leaveType',
      type: 'relationship',
      relationTo: 'leave-types',
      required: true,
      index: true,
    },
    {
      name: 'leaveUnit',
      type: 'select',
      required: true,
      defaultValue: 'fullDay',
      options: LEAVE_UNIT_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'totalDays',
      type: 'number',
      required: true,
      min: 0.5,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'reason',
      type: 'textarea',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pendingLeadApproval',
      index: true,
      options: LEAVE_REQUEST_STATUS_OPTIONS.map((option) => ({ ...option })),
    },
    {
      name: 'requestedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
      index: true,
    },
    {
      name: 'leadApprover',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
      index: true,
    },
    {
      name: 'adminApprover',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
      },
      index: true,
    },
    {
      name: 'leadDecisionAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'adminDecisionAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'rejectionReason',
      type: 'textarea',
    },
    {
      name: 'comments',
      type: 'textarea',
    },
    {
      name: 'workflowTrail',
      type: 'array',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'action',
          type: 'select',
          required: true,
          options: [
            { label: 'Applied', value: 'apply' },
            ...LEAVE_WORKFLOW_ACTIONS.map((action) => ({
              label: LEAVE_WORKFLOW_ACTION_LABELS[action],
              value: action,
            })),
          ],
        },
        {
          name: 'fromStatus',
          type: 'select',
          options: LEAVE_REQUEST_STATUS_OPTIONS.map((option) => ({ ...option })),
        },
        {
          name: 'toStatus',
          type: 'select',
          required: true,
          options: LEAVE_REQUEST_STATUS_OPTIONS.map((option) => ({ ...option })),
        },
        {
          name: 'comment',
          type: 'textarea',
        },
        {
          name: 'overrideReason',
          type: 'textarea',
        },
        {
          name: 'actedBy',
          type: 'relationship',
          relationTo: 'users',
        },
        {
          name: 'actedAt',
          type: 'date',
          required: true,
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const typedOriginal = originalDoc as Record<string, unknown> | undefined

        const leaveRequestCode = await resolveBusinessCode({
          collection: 'leave-requests',
          data: typedData,
          fieldName: 'leaveRequestCode',
          originalDoc: typedOriginal,
          prefix: 'LVR',
          req,
        })

        return {
          ...typedData,
          leaveRequestCode,
        }
      },
    ],
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const typedData = data as Record<string, unknown>
        const typedOriginal = originalDoc as Record<string, unknown> | undefined
        const user = req.user as InternalUserLike

        if (!user?.id || !user.role || !isInternalRole(user.role)) {
          throw new APIError('Authentication required.', 401)
        }

        const employeeID = readRelationID(typedData.employee ?? typedOriginal?.employee)
        const leaveTypeID = readRelationID(typedData.leaveType ?? typedOriginal?.leaveType)

        if (!employeeID || !leaveTypeID) {
          throw new APIError('Employee and leave type are required.', 400)
        }

        const employeeDoc: EmployeeProfile = await req.payload.findByID({
          collection: 'employee-profiles',
          depth: 1,
          id: employeeID,
          overrideAccess: true,
          req,
        })

        const employeeUser = employeeDoc.user
        const employeeUserID = readRelationID(employeeUser)

        if (!employeeUserID) {
          throw new APIError('Employee profile is not mapped to an internal user.', 400)
        }

        const employeeUserDoc: User =
          typeof employeeUser === 'object' && employeeUser !== null
            ? employeeUser
            : await req.payload.findByID({
                collection: 'users',
                depth: 0,
                id: employeeUserID,
                overrideAccess: true,
                req,
              })

        const employeeRole = normalizeEmployeeRole(employeeUserDoc.role)
        const leaveUnitValue = String(typedData.leaveUnit ?? typedOriginal?.leaveUnit ?? 'fullDay')
        const leaveUnit = LEAVE_UNITS.includes(leaveUnitValue as (typeof LEAVE_UNITS)[number])
          ? (leaveUnitValue as 'fullDay' | 'halfDay')
          : 'fullDay'

        const startDate = String(typedData.startDate ?? typedOriginal?.startDate ?? '')
        const endDate = String(typedData.endDate ?? typedOriginal?.endDate ?? '')
        const totalDays = computeLeaveDays({
          endDate,
          leaveUnit,
          startDate,
        })

        const requestedByID = readRelationID(typedData.requestedBy ?? typedOriginal?.requestedBy) || user.id
        const previousStatus = isLeaveStatus(typedOriginal?.status)
          ? (typedOriginal?.status as LeaveRequestStatus)
          : null

        const isRequester = String(requestedByID) === String(user.id)
        const workflowActionContext = readActionContext(req.context?.leaveWorkflowAction)
        let nextStatus = isLeaveStatus(typedData.status)
          ? (typedData.status as LeaveRequestStatus)
          : previousStatus || 'pendingLeadApproval'
        let workflowAction: LeaveWorkflowAction | null = workflowActionContext?.action || null

        if (operation === 'create') {
          nextStatus = employeeRole === 'recruiter' ? 'pendingLeadApproval' : 'pendingAdminApproval'
          if (!isRequester && !hasInternalRole(user, ['admin'])) {
            throw new APIError('Only admin can create leave request on behalf of another user.', 403)
          }
          workflowAction = null
        } else if (previousStatus) {
          if (nextStatus !== previousStatus) {
            if (workflowActionContext) {
              const resolution = resolveLeaveWorkflowAction({
                action: workflowActionContext.action,
                actorRole: user.role,
                currentStatus: previousStatus,
                employeeRole,
                isRequester,
              })

              if (!resolution) {
                throw new APIError('Invalid leave workflow transition for this role.', 403)
              }

              if (resolution.requiresComment && !workflowActionContext.comment) {
                throw new APIError('Comments are required for this leave action.', 400)
              }

              if (resolution.requiresOverrideReason && !workflowActionContext.overrideReason) {
                throw new APIError('Override reason is required for admin override actions.', 400)
              }

              nextStatus = resolution.nextStatus
              workflowAction = workflowActionContext.action
            } else {
              const inferred = inferLegacyAction({
                actorRole: user.role,
                isRequester,
                nextStatus,
                previousStatus,
              })

              if (!inferred) {
                throw new APIError('Invalid leave workflow transition for this role.', 403)
              }

              const inferredResolution = resolveLeaveWorkflowAction({
                action: inferred,
                actorRole: user.role,
                currentStatus: previousStatus,
                employeeRole,
                isRequester,
              })

              if (!inferredResolution) {
                throw new APIError('Invalid leave workflow transition for this role.', 403)
              }

              nextStatus = inferredResolution.nextStatus
              workflowAction = inferred
            }
          }
        }

        if (operation === 'create') {
          const overlap = await req.payload.find({
            collection: 'leave-requests',
            depth: 0,
            limit: 1,
            overrideAccess: true,
            pagination: false,
            req,
            where: {
              and: [
                {
                  employee: {
                    equals: employeeID,
                  },
                },
                {
                  status: {
                    in: ['pendingLeadApproval', 'pendingAdminApproval', 'approved'],
                  },
                },
                {
                  startDate: {
                    less_than_equal: endDate,
                  },
                },
                {
                  endDate: {
                    greater_than_equal: startDate,
                  },
                },
              ],
            },
          })

          if (overlap.totalDocs > 0) {
            throw new APIError('Overlapping leave request already exists for selected period.', 409)
          }
        }

        const nowISO = new Date().toISOString()
        const configuredReportingManager = readRelationID(employeeDoc.reportingManager)
        const existingTrail = Array.isArray(typedOriginal?.workflowTrail)
          ? (typedOriginal?.workflowTrail as Array<Record<string, unknown>>)
          : []

        const trailPayload =
          operation === 'create'
            ? [
                ...existingTrail,
                {
                  actedAt: nowISO,
                  actedBy: user.id,
                  action: 'apply',
                  comment: String(typedData.reason || ''),
                  fromStatus: undefined,
                  overrideReason: undefined,
                  toStatus: nextStatus,
                },
              ]
            : previousStatus && previousStatus !== nextStatus
              ? [
                  ...existingTrail,
                  {
                    actedAt: nowISO,
                    actedBy: user.id,
                    action: workflowAction || inferLegacyAction({
                      actorRole: user.role,
                      isRequester,
                      nextStatus,
                      previousStatus,
                    }) || 'cancel',
                    comment:
                      workflowActionContext?.comment || String(typedData.comments || '').trim() || undefined,
                    fromStatus: previousStatus,
                    overrideReason: workflowActionContext?.overrideReason || undefined,
                    toStatus: nextStatus,
                  },
                ]
              : existingTrail

        const leadReviewed =
          previousStatus === 'pendingLeadApproval' &&
          nextStatus !== 'pendingLeadApproval' &&
          hasInternalRole(user, ['leadRecruiter'])

        const adminReviewed =
          ['pendingLeadApproval', 'pendingAdminApproval'].includes(previousStatus || '') &&
          ['approved', 'rejected'].includes(nextStatus) &&
          hasInternalRole(user, ['admin'])

        return {
          ...typedData,
          adminApprover: adminReviewed ? user.id : typedOriginal?.adminApprover,
          adminDecisionAt: adminReviewed ? nowISO : typedOriginal?.adminDecisionAt,
          employee: employeeID,
          employeeRole,
          endDate,
          leadApprover:
            operation === 'create'
              ? employeeRole === 'recruiter'
                ? configuredReportingManager || undefined
                : undefined
              : leadReviewed
                ? user.id
                : typedOriginal?.leadApprover,
          leadDecisionAt: leadReviewed ? nowISO : typedOriginal?.leadDecisionAt,
          leaveType: leaveTypeID,
          leaveUnit,
          rejectionReason:
            nextStatus === 'rejected'
              ? workflowActionContext?.comment || String(typedData.rejectionReason || '').trim() || undefined
              : typedData.rejectionReason ?? typedOriginal?.rejectionReason,
          requestedBy: requestedByID,
          startDate,
          status: nextStatus,
          totalDays,
          workflowTrail: trailPayload,
        }
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc, req }) => {
        const nextStatus = String(doc.status || '')
        const previousStatus = String(previousDoc?.status || '')

        if (operation === 'create' && nextStatus !== 'approved') {
          return doc
        }

        if (operation === 'update' && !(nextStatus === 'approved' && previousStatus !== 'approved')) {
          return doc
        }

        await applyApprovedLeaveToAttendance({
          leaveRequest: doc,
          req,
        })

        return doc
      },
    ],
  },
  indexes: [
    {
      fields: ['leaveRequestCode'],
      unique: true,
    },
    {
      fields: ['employee', 'status', 'startDate'],
    },
    {
      fields: ['requestedBy', 'status'],
    },
  ],
}
