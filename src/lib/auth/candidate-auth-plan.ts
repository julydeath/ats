import { EXTERNAL_CANDIDATE_ROLE } from '@/lib/constants/roles'

export const CANDIDATE_AUTH_PLAN = {
  role: EXTERNAL_CANDIDATE_ROLE,
  reservedCollections: {
    applications: 'applications',
    candidateInvites: 'candidate-invites',
    candidates: 'candidates',
  },
  invitePolicy: {
    singleUseToken: true,
    tokenTTLHours: Number(process.env.CANDIDATE_INVITE_TOKEN_TTL_HOURS || 72),
    verificationRequiredBeforeActivation: true,
  },
  lifecycle: [
    'recruiter_adds_candidate_under_job',
    'lead_recruiter_approves_candidate',
    'system_sends_invite_email',
    'candidate_submits_application_form',
    'candidate_account_activated_for_tracking',
  ],
  invariants: [
    'Candidates remain external entities and are never stored as internal employees.',
    'Applications are the only candidate-job mapping source of truth.',
    'Job-stage is tracked on application progress, never on candidate master.',
  ],
} as const

export type CandidateAuthLifecycleStep = (typeof CANDIDATE_AUTH_PLAN.lifecycle)[number]
