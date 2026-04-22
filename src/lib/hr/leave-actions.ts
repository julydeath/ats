import { APIError, type Payload } from 'payload'

import { type InternalUserLike } from '@/access/internalRoles'
import { LEAVE_REQUEST_STATUSES, type LeaveRequestStatus } from '@/lib/constants/hr'
import { isInternalRole } from '@/lib/constants/roles'
import { resolveLeaveWorkflowAction, type LeaveWorkflowAction } from '@/lib/hr/leave-workflow'
import { readRelationID } from '@/lib/hr/common'

export type LeaveActionInput = {
  action: LeaveWorkflowAction
  comment?: string | null
  leaveRequestId: number | string
  overrideReason?: string | null
}

const toLeaveRequestID = (value: unknown): number | string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return null
}

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const parseLeaveActionInput = (formData: FormData): LeaveActionInput => {
  const leaveRequestId = toLeaveRequestID(formData.get('leaveRequestId'))
  const actionValue = String(formData.get('action') || '').trim() as LeaveWorkflowAction

  if (!leaveRequestId || !actionValue) {
    throw new APIError('Valid review action and leave request ID are required.', 400)
  }

  return {
    action: actionValue,
    comment: normalizeText(formData.get('comment')),
    leaveRequestId,
    overrideReason: normalizeText(formData.get('overrideReason')),
  }
}

export const executeLeaveAction = async ({
  input,
  payload,
  user,
}: {
  input: LeaveActionInput
  payload: Payload
  user: InternalUserLike
}) => {
  if (!user?.id || !user.role || !isInternalRole(user.role)) {
    throw new APIError('Authentication required.', 401)
  }

  const leaveRequest = await payload.findByID({
    collection: 'leave-requests',
    depth: 0,
    id: input.leaveRequestId,
    overrideAccess: false,
    user,
  })

  const currentStatus = String(leaveRequest.status || '')
  const leaveRequestStatus: LeaveRequestStatus = LEAVE_REQUEST_STATUSES.includes(currentStatus as LeaveRequestStatus)
    ? (currentStatus as LeaveRequestStatus)
    : 'pendingLeadApproval'
  const employeeRoleRaw = String(leaveRequest.employeeRole || 'recruiter')
  const employeeRole = isInternalRole(employeeRoleRaw) ? employeeRoleRaw : 'recruiter'
  const requestedByID = readRelationID(leaveRequest.requestedBy)
  const isRequester = requestedByID !== null && String(requestedByID) === String(user.id)

  const resolution = resolveLeaveWorkflowAction({
    action: input.action,
    actorRole: user.role,
    currentStatus: leaveRequestStatus,
    employeeRole,
    isRequester,
  })

  if (!resolution) {
    throw new APIError('Invalid leave workflow transition for this role.', 403)
  }

  if (resolution.requiresComment && !input.comment) {
    throw new APIError('Comment is required for this leave action.', 400)
  }

  if (resolution.requiresOverrideReason && !input.overrideReason) {
    throw new APIError('Override reason is required for this leave action.', 400)
  }

  const comment = input.comment || undefined

  await payload.update({
    collection: 'leave-requests',
    data: {
      comments: comment,
      rejectionReason: input.action === 'reject' ? comment : undefined,
      status: resolution.nextStatus,
    },
    id: input.leaveRequestId,
    overrideAccess: false,
    user,
    context: {
      leaveWorkflowAction: {
        action: input.action,
        comment: input.comment,
        overrideReason: input.overrideReason,
      },
    },
  })

  return {
    action: input.action,
    nextStatus: resolution.nextStatus,
  }
}
