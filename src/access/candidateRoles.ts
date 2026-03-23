import { EXTERNAL_CANDIDATE_ROLE, type ExternalCandidateRole } from '@/lib/constants/roles'
import { extractRelationshipID } from '@/lib/utils/relationships'

export type CandidateUserLike =
  | {
      candidateProfile?: number | string | { id?: number | string } | null
      id: number | string
      isActive?: boolean | null
      role?: ExternalCandidateRole | string | null
    }
  | null
  | undefined

export const isCandidateRole = (role: unknown): role is ExternalCandidateRole =>
  role === EXTERNAL_CANDIDATE_ROLE

export const isCandidateAuthenticated = (
  user: CandidateUserLike,
): user is NonNullable<CandidateUserLike> & { role: ExternalCandidateRole } =>
  Boolean(user && isCandidateRole(user.role))

export const getCandidateProfileID = (user: CandidateUserLike): number | string | null => {
  if (!isCandidateAuthenticated(user)) {
    return null
  }

  return extractRelationshipID(user.candidateProfile)
}
