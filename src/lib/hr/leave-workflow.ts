import type { LeaveRequestStatus } from '@/lib/constants/hr'
import type { InternalRole } from '@/lib/constants/roles'

export const LEAVE_WORKFLOW_ACTIONS = [
  'leadApprove',
  'adminApprove',
  'adminOverrideApprove',
  'reject',
  'cancel',
] as const

export type LeaveWorkflowAction = (typeof LEAVE_WORKFLOW_ACTIONS)[number]

export const LEAVE_WORKFLOW_ACTION_LABELS: Record<LeaveWorkflowAction, string> = {
  leadApprove: 'Lead Approve',
  adminApprove: 'Admin Approve',
  adminOverrideApprove: 'Admin Override Approve',
  reject: 'Reject',
  cancel: 'Cancel',
}

export type LeaveWorkflowContext = {
  action: LeaveWorkflowAction
  actorRole: InternalRole
  currentStatus: LeaveRequestStatus
  employeeRole: InternalRole
  isRequester: boolean
}

export type LeaveWorkflowResolution = {
  nextStatus: LeaveRequestStatus
  requiresComment: boolean
  requiresOverrideReason: boolean
}

export type LeaveQueueBuckets = {
  adminOverrideEligible: boolean
  needsAdminAction: boolean
  needsLeadAction: boolean
}

const isLeadActionableRecruiterLeave = ({
  currentStatus,
  employeeRole,
}: {
  currentStatus: LeaveRequestStatus
  employeeRole: InternalRole
}): boolean => currentStatus === 'pendingLeadApproval' && employeeRole === 'recruiter'

const isAdminOverrideStage = ({ currentStatus }: { currentStatus: LeaveRequestStatus }): boolean =>
  currentStatus === 'pendingLeadApproval'

export const resolveLeaveWorkflowAction = ({
  action,
  actorRole,
  currentStatus,
  employeeRole,
  isRequester,
}: LeaveWorkflowContext): LeaveWorkflowResolution | null => {
  if (action === 'leadApprove') {
    if (actorRole !== 'leadRecruiter') return null
    if (!isLeadActionableRecruiterLeave({ currentStatus, employeeRole })) return null

    return {
      nextStatus: 'pendingAdminApproval',
      requiresComment: false,
      requiresOverrideReason: false,
    }
  }

  if (action === 'adminApprove') {
    if (actorRole !== 'admin') return null
    if (currentStatus !== 'pendingAdminApproval') return null

    return {
      nextStatus: 'approved',
      requiresComment: false,
      requiresOverrideReason: false,
    }
  }

  if (action === 'adminOverrideApprove') {
    if (actorRole !== 'admin') return null
    if (currentStatus !== 'pendingLeadApproval' && currentStatus !== 'pendingAdminApproval') return null

    return {
      nextStatus: 'approved',
      requiresComment: true,
      requiresOverrideReason: currentStatus === 'pendingLeadApproval',
    }
  }

  if (action === 'reject') {
    if (actorRole === 'leadRecruiter') {
      if (!isLeadActionableRecruiterLeave({ currentStatus, employeeRole })) return null

      return {
        nextStatus: 'rejected',
        requiresComment: true,
        requiresOverrideReason: false,
      }
    }

    if (actorRole === 'admin') {
      if (currentStatus !== 'pendingLeadApproval' && currentStatus !== 'pendingAdminApproval') return null

      return {
        nextStatus: 'rejected',
        requiresComment: true,
        requiresOverrideReason: isAdminOverrideStage({ currentStatus }),
      }
    }

    return null
  }

  if (action === 'cancel') {
    if (!isRequester) return null
    if (currentStatus !== 'pendingLeadApproval' && currentStatus !== 'pendingAdminApproval') return null

    return {
      nextStatus: 'cancelled',
      requiresComment: false,
      requiresOverrideReason: false,
    }
  }

  return null
}

export const getLeaveQueueBuckets = ({
  employeeRole,
  role,
  status,
}: {
  employeeRole: InternalRole
  role: InternalRole
  status: LeaveRequestStatus
}): LeaveQueueBuckets => {
  if (role === 'admin') {
    return {
      adminOverrideEligible: status === 'pendingLeadApproval',
      needsAdminAction: status === 'pendingAdminApproval',
      needsLeadAction: false,
    }
  }

  if (role === 'leadRecruiter') {
    return {
      adminOverrideEligible: false,
      needsAdminAction: false,
      needsLeadAction: status === 'pendingLeadApproval' && employeeRole === 'recruiter',
    }
  }

  return {
    adminOverrideEligible: false,
    needsAdminAction: false,
    needsLeadAction: false,
  }
}

export const getAvailableLeaveActions = ({
  actorID,
  actorRole,
  currentStatus,
  employeeRole,
  requestedByID,
}: {
  actorID: number | string
  actorRole: InternalRole
  currentStatus: LeaveRequestStatus
  employeeRole: InternalRole
  requestedByID: number | string | null
}): LeaveWorkflowAction[] => {
  const isRequester = requestedByID !== null && String(actorID) === String(requestedByID)

  return LEAVE_WORKFLOW_ACTIONS.filter((action) =>
    Boolean(
      resolveLeaveWorkflowAction({
        action,
        actorRole,
        currentStatus,
        employeeRole,
        isRequester,
      }),
    ),
  )
}
