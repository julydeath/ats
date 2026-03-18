import type { Access } from 'payload'

import { INTERNAL_ROLES, type InternalRole, isInternalRole } from '@/lib/constants/roles'

export type InternalUserLike =
  | {
      id: number | string
      role?: InternalRole | null | string
    }
  | null
  | undefined

export const hasInternalRole = (
  user: InternalUserLike,
  allowedRoles: readonly InternalRole[],
): boolean => {
  if (!user || !user.role || !isInternalRole(user.role)) {
    return false
  }

  return allowedRoles.includes(user.role)
}

export const isInternalAuthenticated = (user: InternalUserLike): boolean =>
  hasInternalRole(user, INTERNAL_ROLES)

export const canManageInternalUsers = (user: InternalUserLike): boolean =>
  hasInternalRole(user, ['admin', 'headRecruiter'])

export const internalUserAccess: Access = ({ req: { user } }) =>
  isInternalAuthenticated(user as InternalUserLike)

export const internalAdminAccess = ({ req: { user } }: { req: { user: InternalUserLike } }): boolean =>
  isInternalAuthenticated(user as InternalUserLike)

export const adminOnlyAccess: Access = ({ req: { user } }) =>
  hasInternalRole(user as InternalUserLike, ['admin'])

export const adminOrHeadRecruiterAccess: Access = ({ req: { user } }) =>
  hasInternalRole(user as InternalUserLike, ['admin', 'headRecruiter'])

export const adminOrHeadRecruiterAdminAccess = ({
  req: { user },
}: {
  req: { user: InternalUserLike }
}): boolean => hasInternalRole(user as InternalUserLike, ['admin', 'headRecruiter'])

export const selfOrLeadershipAccess: Access = ({ req: { user } }) => {
  const internalUser = user as InternalUserLike

  if (!internalUser) {
    return false
  }

  if (hasInternalRole(internalUser, ['admin', 'headRecruiter', 'leadRecruiter'])) {
    return true
  }

  return {
    id: {
      equals: internalUser.id,
    },
  }
}

export const selfOrHeadRecruiterAccess: Access = ({ req: { user } }) => {
  const internalUser = user as InternalUserLike

  if (!internalUser) {
    return false
  }

  if (hasInternalRole(internalUser, ['admin', 'headRecruiter'])) {
    return true
  }

  return {
    id: {
      equals: internalUser.id,
    },
  }
}
