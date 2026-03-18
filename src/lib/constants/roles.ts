export const INTERNAL_ROLES = ['admin', 'headRecruiter', 'leadRecruiter', 'recruiter'] as const

export type InternalRole = (typeof INTERNAL_ROLES)[number]

export const EXTERNAL_CANDIDATE_ROLE = 'candidate' as const
export type ExternalCandidateRole = typeof EXTERNAL_CANDIDATE_ROLE

export const INTERNAL_ROLE_LABELS: Readonly<Record<InternalRole, string>> = {
  admin: 'Admin',
  headRecruiter: 'Head Recruiter',
  leadRecruiter: 'Lead Recruiter',
  recruiter: 'Recruiter',
}

export const INTERNAL_ROLE_OPTIONS: ReadonlyArray<{ label: string; value: InternalRole }> =
  INTERNAL_ROLES.map((role) => ({
    label: INTERNAL_ROLE_LABELS[role],
    value: role,
  }))

export const isInternalRole = (role: unknown): role is InternalRole =>
  typeof role === 'string' && INTERNAL_ROLES.includes(role as InternalRole)
