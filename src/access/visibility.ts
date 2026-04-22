import type { Access, Where } from 'payload'

import {
  getCandidateProfileID,
  isCandidateAuthenticated,
  type CandidateUserLike,
} from '@/access/candidateRoles'
import { type InternalRole } from '@/lib/constants/roles'
import { extractRelationshipID } from '@/lib/utils/relationships'
import { hasInternalRole, type InternalUserLike } from './internalRoles'

type VisibilityUser = InternalUserLike & {
  role: InternalRole
}

type CandidateVisibilityUser = CandidateUserLike & {
  role: 'candidate'
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

const toCandidateVisibilityUser = (user: CandidateUserLike): CandidateVisibilityUser | null => {
  if (!isCandidateAuthenticated(user)) {
    return null
  }

  return user as CandidateVisibilityUser
}

const buildCandidateSelfWhere = (user: CandidateVisibilityUser): Where | false => {
  const candidateProfileID = getCandidateProfileID(user)

  if (!candidateProfileID) {
    return false
  }

  return {
    id: {
      equals: candidateProfileID,
    },
  }
}

const buildCandidateApplicationWhere = (user: CandidateVisibilityUser): Where | false => {
  const candidateProfileID = getCandidateProfileID(user)

  if (!candidateProfileID) {
    return false
  }

  return {
    candidate: {
      equals: candidateProfileID,
    },
  }
}

export const clientReadAccess: Access = ({ req }) =>
  Boolean(toVisibilityUser(req.user as InternalUserLike))

export const clientManageAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter'])

export const clientCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter'])

export const jobsReadAccess: Access = ({ req }) =>
  Boolean(toVisibilityUser(req.user as InternalUserLike))

export const jobsManageAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter'])

export const jobsCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter'])

export const extractOwningLeadRecruiterID = (value: unknown): number | string | null =>
  extractRelationshipID(value)

export const candidatesReadAccess: Access = ({ req }) => {
  const internalUser = toVisibilityUser(req.user as InternalUserLike)

  if (internalUser) {
    return true
  }

  const candidateUser = toCandidateVisibilityUser(req.user as CandidateUserLike)

  if (!candidateUser) {
    return false
  }

  return buildCandidateSelfWhere(candidateUser)
}

export const candidatesManageAccess: Access = ({ req }) => {
  const internalUser = toVisibilityUser(req.user as InternalUserLike)

  if (internalUser) {
    return true
  }

  const candidateUser = toCandidateVisibilityUser(req.user as CandidateUserLike)

  if (!candidateUser) {
    return false
  }

  return buildCandidateSelfWhere(candidateUser)
}

export const candidatesCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

export const candidateResumeReadAccess: Access = ({ req }) =>
  Boolean(toVisibilityUser(req.user as InternalUserLike))

export const candidateResumeCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

export const candidateResumeDeleteAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

export const applicationsReadAccess: Access = ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (user) {
    return true
  }

  const candidateUser = toCandidateVisibilityUser(req.user as CandidateUserLike)

  if (!candidateUser) {
    return false
  }

  return buildCandidateApplicationWhere(candidateUser)
}

export const applicationsCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

export const applicationsUpdateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

export const applicationsDeleteAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin'])

export const jobTemplatesReadAccess: Access = ({ req }) =>
  Boolean(toVisibilityUser(req.user as InternalUserLike))

export const jobTemplatesManageAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter'])

export const interviewsReadAccess: Access = ({ req }) =>
  Boolean(toVisibilityUser(req.user as InternalUserLike))

export const interviewsManageAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

export const placementsReadAccess: Access = ({ req }) =>
  Boolean(toVisibilityUser(req.user as InternalUserLike))

export const placementsManageAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter'])

export const candidateActivitiesReadAccess: Access = ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (user) {
    return true
  }

  const candidateUser = toCandidateVisibilityUser(req.user as CandidateUserLike)

  if (!candidateUser) {
    return false
  }

  return buildCandidateApplicationWhere(candidateUser)
}

export const candidateActivitiesCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

export const candidateActivitiesUpdateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter', 'recruiter'])

export const candidateActivitiesDeleteAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin'])

export const applicationHistoryReadAccess: Access = ({ req }) => {
  const user = toVisibilityUser(req.user as InternalUserLike)

  if (user) {
    return true
  }

  const candidateUser = toCandidateVisibilityUser(req.user as CandidateUserLike)

  if (!candidateUser) {
    return false
  }

  return buildCandidateApplicationWhere(candidateUser)
}

export const applicationHistoryCreateAccess: Access = ({ req }) =>
  hasInternalRole(req.user as InternalUserLike, ['admin', 'leadRecruiter'])
