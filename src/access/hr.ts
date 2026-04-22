import type { Access, PayloadRequest, Where } from 'payload'

import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'

const isInternal = (user: InternalUserLike): boolean =>
  hasInternalRole(user, ['admin', 'leadRecruiter', 'recruiter'])

const toInternalUser = (req: PayloadRequest): InternalUserLike => req.user as InternalUserLike

const findEmployeeProfileIDByUser = async (req: PayloadRequest): Promise<number | string | null> => {
  const user = toInternalUser(req)

  if (!user?.id) {
    return null
  }

  const employee = await req.payload.find({
    collection: 'employee-profiles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      user: {
        equals: user.id,
      },
    },
  })

  return employee.docs[0]?.id || null
}

const selfEmployeeWhere = async (req: PayloadRequest): Promise<Where | false> => {
  const employeeID = await findEmployeeProfileIDByUser(req)

  if (!employeeID) {
    return false
  }

  return {
    employee: {
      equals: employeeID,
    },
  }
}

const selfProfileWhere = async (req: PayloadRequest): Promise<Where | false> => {
  const user = toInternalUser(req)

  if (!user?.id) {
    return false
  }

  return {
    user: {
      equals: user.id,
    },
  }
}

export const employeeProfileReadAccess: Access = async ({ req }) => {
  const user = toInternalUser(req)

  if (!isInternal(user)) {
    return false
  }

  if (hasInternalRole(user, ['admin', 'leadRecruiter'])) {
    return true
  }

  return selfProfileWhere(req)
}

export const employeeProfileManageAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin', 'leadRecruiter'])

export const employeeCompensationReadAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const employeeCompensationManageAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const attendanceShiftReadAccess: Access = ({ req }) =>
  isInternal(toInternalUser(req))

export const attendanceShiftManageAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const holidayCalendarReadAccess: Access = ({ req }) =>
  isInternal(toInternalUser(req))

export const holidayCalendarManageAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const attendanceLogReadAccess: Access = async ({ req }) => {
  const user = toInternalUser(req)

  if (!isInternal(user)) {
    return false
  }

  if (hasInternalRole(user, ['admin', 'leadRecruiter'])) {
    return true
  }

  return selfEmployeeWhere(req)
}

export const attendanceLogManageAccess: Access = ({ req }) =>
  isInternal(toInternalUser(req))

export const attendanceSummaryReadAccess: Access = async ({ req }) => {
  const user = toInternalUser(req)

  if (!isInternal(user)) {
    return false
  }

  if (hasInternalRole(user, ['admin', 'leadRecruiter'])) {
    return true
  }

  return selfEmployeeWhere(req)
}

export const attendanceSummaryManageAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const leaveTypeReadAccess: Access = ({ req }) =>
  isInternal(toInternalUser(req))

export const leaveTypeManageAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const leaveBalanceReadAccess: Access = async ({ req }) => {
  const user = toInternalUser(req)

  if (!isInternal(user)) {
    return false
  }

  if (hasInternalRole(user, ['admin', 'leadRecruiter'])) {
    return true
  }

  return selfEmployeeWhere(req)
}

export const leaveBalanceManageAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const leaveRequestReadAccess: Access = async ({ req }) => {
  const user = toInternalUser(req)

  if (!isInternal(user)) {
    return false
  }

  if (hasInternalRole(user, ['admin', 'leadRecruiter'])) {
    return true
  }

  const safeUser = user as { id: number | string }

  const employeeID = await findEmployeeProfileIDByUser(req)

  if (!employeeID) {
    return false
  }

  return {
    or: [
      {
        employee: {
          equals: employeeID,
        },
      },
      {
        requestedBy: {
          equals: safeUser.id,
        },
      },
    ],
  } as Where
}

export const leaveRequestManageAccess: Access = ({ req }) =>
  isInternal(toInternalUser(req))

export const performanceCycleReadAccess: Access = ({ req }) =>
  isInternal(toInternalUser(req))

export const performanceCycleManageAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const performanceSnapshotReadAccess: Access = async ({ req }) => {
  const user = toInternalUser(req)

  if (!isInternal(user)) {
    return false
  }

  if (hasInternalRole(user, ['admin', 'leadRecruiter'])) {
    return true
  }

  return selfEmployeeWhere(req)
}

export const performanceSnapshotManageAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const performanceReviewReadAccess: Access = async ({ req }) => {
  const user = toInternalUser(req)

  if (!isInternal(user)) {
    return false
  }

  if (hasInternalRole(user, ['admin', 'leadRecruiter'])) {
    return true
  }

  const safeUser = user as { id: number | string }

  const employeeWhere = await selfEmployeeWhere(req)

  if (!employeeWhere) {
    return false
  }

  return {
    or: [
      employeeWhere,
      {
        reviewer: {
          equals: safeUser.id,
        },
      },
    ],
  } as Where
}

export const performanceReviewManageAccess: Access = ({ req }) =>
  isInternal(toInternalUser(req))

export const payrollAdminReadAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const payrollAdminManageAccess: Access = ({ req }) =>
  hasInternalRole(toInternalUser(req), ['admin'])

export const isInternalEmployeeUser = (user: InternalUserLike): boolean =>
  isInternal(user)
