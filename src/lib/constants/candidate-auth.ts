export const CANDIDATE_ONBOARDING_METHODS = ['password', 'magicLink', 'oauth'] as const

export type CandidateOnboardingMethod = (typeof CANDIDATE_ONBOARDING_METHODS)[number]

export const CANDIDATE_ONBOARDING_METHOD_LABELS: Record<CandidateOnboardingMethod, string> = {
  password: 'Password',
  magicLink: 'Magic Link',
  oauth: 'OAuth',
}

export const CANDIDATE_ONBOARDING_METHOD_OPTIONS = CANDIDATE_ONBOARDING_METHODS.map((value) => ({
  label: CANDIDATE_ONBOARDING_METHOD_LABELS[value],
  value,
}))
