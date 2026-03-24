import type { Access, Where } from 'payload'

import {
  getCandidateProfileID,
  isCandidateAuthenticated,
  type CandidateUserLike,
} from '@/access/candidateRoles'
import {
  getLeadAssignedClientIDs,
  getLeadAssignedJobIDs,
  getLeadVisibleClientIDs,
  getLeadVisibleJobIDs,
  getRecruiterAssignedJobIDs,
} from '@/lib/assignments/selectors'
import { type InternalRole } from '@/lib/constants/roles'
import { extractRelationshipID } from '@/lib/utils/relationships'
import { hasInternalRole, type InternalUserLike } from './internalRoles'

type VisibilityUser = InternalUserLike & {
  role: InternalRole
}

const EMPTY_SCOPE_WHERE: Where = {
  id: {
    in: [],
  },
}

const toVisibilityUser = (user: InternalUserLike): VisibilityUser | null => {
  if (!user || !user.role) {
    return null
  }

  if (!hasInternalRole(user, ['admin', 'leadRecruiter', 'recruiter'])) {
    return null
  }

  return user as VisibilityUser
}

type CandidateVisibilityUser = CandidateUserLike & {
  role: 'candidate'
}

const toCandidateVisibilityUser = (user: CandidateUserLike): CandidateVisibilityUser | null => {
  if (!isCandidateAuthenticated(user)) {
    return null
  }

  return user as CandidateVisibilityUser
}

export const clientReadAccess: Access = async ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'leadRecruiter') {
    const visibleClientIDs = await getLeadVisibleClientIDs({
      leadRecruiterID: user.id,
      req,
    })

    if (visibleClientIDs.length === 0) {
      return EMPTY_SCOPE_WHERE
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

  return user.role === 'admin'
}

export const clientCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin'])

export const jobsReadAccess: Access = async ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
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
      return EMPTY_SCOPE_WHERE
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
      return EMPTY_SCOPE_WHERE
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

export const jobsManageAccess: Access = async ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'leadRecruiter') {
    const jobIDs = await getLeadVisibleJobIDs({
      leadRecruiterID: user.id,
      req,
    })

    if (jobIDs.length === 0) {
      return EMPTY_SCOPE_WHERE
    }

    return {
      id: {
        in: jobIDs,
      },
    } as Where
  }

  return false
}

export const jobsCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter'])

export const extractOwningLeadRecruiterID = (value: unknown): number | string | null =>
  extractRelationshipID(value)

const buildJobScopedAccess = async ({
  fieldName,
  req,
  user,
}: {
  fieldName: string
  req: Parameters<Access>[0]['req']
  user: VisibilityUser
}): Promise<true | false | Where> => {
  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'leadRecruiter') {
    const jobIDs = await getLeadVisibleJobIDs({
      leadRecruiterID: user.id,
      req,
    })

    if (jobIDs.length === 0) {
      return {
        [fieldName]: {
          in: [],
        },
      } as Where
    }

    return {
      [fieldName]: {
        in: jobIDs,
      },
    } as Where
  }

  if (user.role === 'recruiter') {
    const jobIDs = await getRecruiterAssignedJobIDs({
      recruiterID: user.id,
      req,
    })

    if (jobIDs.length === 0) {
      return {
        [fieldName]: {
          in: [],
        },
      } as Where
    }

    return {
      [fieldName]: {
        in: jobIDs,
      },
    } as Where
  }

  return false
}

export const candidatesReadAccess: Access = async ({ req }) => {
  const internalUser = toVisibilityUser(req.user as InternalUserLike)

  if (internalUser) {
    return buildJobScopedAccess({
      fieldName: 'sourceJob',
      req,
      user: internalUser,
    })
  }

  const candidateUser = toCandidateVisibilityUser(req.user as CandidateUserLike)

  if (!candidateUser) {
    return false
  }

  const candidateProfileID = getCandidateProfileID(candidateUser)

  if (!candidateProfileID) {
    return false
  }

  return {
    id: {
      equals: candidateProfileID,
    },
  }
}

export const candidatesManageAccess: Access = async ({ req }) => {
  const internalUser = toVisibilityUser(req.user as InternalUserLike)

  if (internalUser) {
    return buildJobScopedAccess({
      fieldName: 'sourceJob',
      req,
      user: internalUser,
    })
  }

  const candidateUser = toCandidateVisibilityUser(req.user as CandidateUserLike)

  if (!candidateUser) {
    return false
  }

  const candidateProfileID = getCandidateProfileID(candidateUser)

  if (!candidateProfileID) {
    return false
  }

  return {
    id: {
      equals: candidateProfileID,
    },
  }
}

export const candidatesCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'recruiter'])

export const candidateResumeReadAccess: Access = async ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (!user) {
    return false
  }

  return buildJobScopedAccess({
    fieldName: 'sourceJob',
    req,
    user,
  })
}

export const candidateResumeCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'recruiter'])

export const candidateResumeDeleteAccess: Access = ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'recruiter') {
    const where: Where = {
      uploadedBy: {
        equals: user.id,
      },
    }

    return where
  }

  return false
}

const buildApplicationJobScopedAccess = async ({
  req,
  user,
}: {
  req: Parameters<Access>[0]['req']
  user: VisibilityUser
}): Promise<true | false | Where> =>
  buildJobScopedAccess({
    fieldName: 'job',
    req,
    user,
  })

export const applicationsReadAccess: Access = async ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (user) {
    if (user.role === 'recruiter') {
      const where: Where = {
        recruiter: {
          equals: user.id,
        },
      }

      return where
    }

    return buildApplicationJobScopedAccess({
      req,
      user,
    })
  }

  const candidateUser = toCandidateVisibilityUser(req.user as CandidateUserLike)

  if (!candidateUser) {
    return false
  }

  const candidateProfileID = getCandidateProfileID(candidateUser)

  if (!candidateProfileID) {
    return false
  }

  return {
    candidate: {
      equals: candidateProfileID,
    },
  }
}

export const applicationsCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'recruiter'])

export const applicationsUpdateAccess: Access = async ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'leadRecruiter') {
    return buildApplicationJobScopedAccess({
      req,
      user,
    })
  }

  if (user.role === 'recruiter') {
    const where: Where = {
      and: [
        {
          recruiter: {
            equals: user.id,
          },
        },
        {
          stage: {
            in: [
              'sourcedByRecruiter',
              'sentBackForCorrection',
              'internalReviewApproved',
              'candidateInvited',
              'candidateApplied',
            ],
          },
        },
      ],
    }

    return where
  }

  return false
}

export const applicationsDeleteAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin'])

export const applicationHistoryReadAccess: Access = async ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (user) {
    if (user.role === 'recruiter') {
      const where: Where = {
        recruiter: {
          equals: user.id,
        },
      }

      return where
    }

    return buildApplicationJobScopedAccess({
      req,
      user,
    })
  }

  const candidateUser = toCandidateVisibilityUser(req.user as CandidateUserLike)

  if (!candidateUser) {
    return false
  }

  const candidateProfileID = getCandidateProfileID(candidateUser)

  if (!candidateProfileID) {
    return false
  }

  return {
    candidate: {
      equals: candidateProfileID,
    },
  }
}

export const applicationHistoryCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])
