import type { Access, Where } from 'payload'

import {
  getLeadAssignedClientIDs,
  getLeadAssignedJobIDs,
  getLeadVisibleClientIDs,
  getRecruiterAssignedJobIDs,
} from '@/lib/assignments/selectors'
import { type InternalRole } from '@/lib/constants/roles'
import { extractRelationshipID } from '@/lib/utils/relationships'
import { hasInternalRole, type InternalUserLike } from './internalRoles'

type VisibilityUser = InternalUserLike & {
  role: InternalRole
}

const toVisibilityUser = (user: InternalUserLike): VisibilityUser | null => {
  if (!user || !user.role) {
    return null
  }

  if (!hasInternalRole(user, ['admin', 'headRecruiter', 'leadRecruiter', 'recruiter'])) {
    return null
  }

  return user as VisibilityUser
}

export const clientReadAccess: Access = async ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'headRecruiter') {
    const where: Where = {
      owningHeadRecruiter: {
        equals: user.id,
      },
    }

    return where
  }

  if (user.role === 'leadRecruiter') {
    const visibleClientIDs = await getLeadVisibleClientIDs({
      leadRecruiterID: user.id,
      req,
    })

    if (visibleClientIDs.length === 0) {
      return false
    }

    const where: Where = {
      id: {
        in: visibleClientIDs,
      },
    }

    return where
  }

  return false
}

export const clientManageAccess: Access = ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'headRecruiter') {
    const where: Where = {
      owningHeadRecruiter: {
        equals: user.id,
      },
    }

    return where
  }

  return false
}

export const clientCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'headRecruiter'])

export const jobsReadAccess: Access = async ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'headRecruiter') {
    const where: Where = {
      owningHeadRecruiter: {
        equals: user.id,
      },
    }

    return where
  }

  if (user.role === 'leadRecruiter') {
    const [jobIDs, clientIDs] = await Promise.all([
      getLeadAssignedJobIDs({ leadRecruiterID: user.id, req }),
      getLeadAssignedClientIDs({ leadRecruiterID: user.id, req }),
    ])

    const clauses: Where[] = []

    if (jobIDs.length > 0) {
      const where: Where = {
        id: {
          in: jobIDs,
        },
      }

      clauses.push(where)
    }

    if (clientIDs.length > 0) {
      const where: Where = {
        client: {
          in: clientIDs,
        },
      }

      clauses.push(where)
    }

    if (clauses.length === 0) {
      return false
    }

    const where: Where = {
      or: clauses,
    }

    return where
  }

  if (user.role === 'recruiter') {
    const jobIDs = await getRecruiterAssignedJobIDs({
      recruiterID: user.id,
      req,
    })

    if (jobIDs.length === 0) {
      return false
    }

    const where: Where = {
      id: {
        in: jobIDs,
      },
    }

    return where
  }

  return false
}

export const jobsManageAccess: Access = ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'headRecruiter') {
    const where: Where = {
      owningHeadRecruiter: {
        equals: user.id,
      },
    }

    return where
  }

  return false
}

export const jobsCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'headRecruiter'])

export const extractOwningHeadRecruiterID = (value: unknown): number | string | null =>
  extractRelationshipID(value)
