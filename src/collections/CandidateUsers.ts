import type { Access, CollectionConfig } from 'payload'

import { isCandidateAuthenticated, type CandidateUserLike } from '@/access/candidateRoles'
import { CANDIDATE_ONBOARDING_METHOD_OPTIONS } from '@/lib/constants/candidate-auth'
import { hasInternalRole, type InternalUserLike } from '@/access/internalRoles'
import { EXTERNAL_CANDIDATE_ROLE } from '@/lib/constants/roles'
import { extractRelationshipID } from '@/lib/utils/relationships'

const internalCandidateUserAdminAccess: Access = ({ req: { user } }) =>
  hasInternalRole(user as InternalUserLike, ['admin', 'headRecruiter'])

const internalCandidateUserAdminBooleanAccess = ({
  req: { user },
}: {
  req: { user: InternalUserLike }
}): boolean => hasInternalRole(user as InternalUserLike, ['admin', 'headRecruiter'])

const candidateUserReadAccess: Access = ({ req: { user } }) => {
  const internalUser = user as InternalUserLike

  if (hasInternalRole(internalUser, ['admin', 'headRecruiter', 'leadRecruiter', 'recruiter'])) {
    return true
  }

  const candidateUser = user as CandidateUserLike

  if (!isCandidateAuthenticated(candidateUser)) {
    return false
  }

  return {
    id: {
      equals: candidateUser.id,
    },
  }
}

const candidateUserUpdateAccess: Access = ({ req: { user } }) => {
  const internalUser = user as InternalUserLike

  if (hasInternalRole(internalUser, ['admin', 'headRecruiter'])) {
    return true
  }

  const candidateUser = user as CandidateUserLike

  if (!isCandidateAuthenticated(candidateUser)) {
    return false
  }

  return {
    id: {
      equals: candidateUser.id,
    },
  }
}

export const CandidateUsers: CollectionConfig = {
  slug: 'candidate-users',
  access: {
    admin: internalCandidateUserAdminBooleanAccess,
    create: internalCandidateUserAdminAccess,
    read: candidateUserReadAccess,
    update: candidateUserUpdateAccess,
    delete: ({ req: { user } }) => hasInternalRole(user as InternalUserLike, ['admin']),
  },
  admin: {
    defaultColumns: ['fullName', 'email', 'candidateProfile', 'onboardingMethod', 'isActive', 'updatedAt'],
    group: 'Candidates',
    useAsTitle: 'fullName',
  },
  auth: {
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
    tokenExpiration: 60 * 60 * 24 * 30,
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: EXTERNAL_CANDIDATE_ROLE,
      saveToJWT: true,
      options: [
        {
          label: 'Candidate',
          value: EXTERNAL_CANDIDATE_ROLE,
        },
      ],
      access: {
        update: ({ req: { user } }) => hasInternalRole(user as InternalUserLike, ['admin', 'headRecruiter']),
      },
    },
    {
      name: 'candidateProfile',
      type: 'relationship',
      relationTo: 'candidates',
      required: true,
      unique: true,
      index: true,
      saveToJWT: true,
      access: {
        update: ({ req: { user } }) => hasInternalRole(user as InternalUserLike, ['admin', 'headRecruiter']),
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      saveToJWT: true,
      index: true,
      access: {
        update: ({ req: { user } }) => hasInternalRole(user as InternalUserLike, ['admin', 'headRecruiter']),
      },
    },
    {
      name: 'onboardingMethod',
      type: 'select',
      required: true,
      defaultValue: 'password',
      options: CANDIDATE_ONBOARDING_METHOD_OPTIONS.map((option) => ({ ...option })),
      access: {
        update: ({ req: { user } }) => hasInternalRole(user as InternalUserLike, ['admin', 'headRecruiter']),
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data }) => {
        const typedData = (data as Record<string, unknown> | undefined) || {}
        const profileID = extractRelationshipID(typedData.candidateProfile)

        return {
          ...typedData,
          candidateProfile: profileID ?? typedData.candidateProfile,
          onboardingMethod: typedData.onboardingMethod || 'password',
          role: EXTERNAL_CANDIDATE_ROLE,
        }
      },
    ],
  },
}
