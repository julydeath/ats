export const CLIENT_STATUSES = ['active', 'inactive'] as const
export type ClientStatus = (typeof CLIENT_STATUSES)[number]

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

export const CLIENT_STATUS_OPTIONS = CLIENT_STATUSES.map((value) => ({
  label: CLIENT_STATUS_LABELS[value],
  value,
}))

export const JOB_EMPLOYMENT_TYPES = ['fullTime', 'partTime', 'contract', 'internship'] as const
export type JobEmploymentType = (typeof JOB_EMPLOYMENT_TYPES)[number]

export const JOB_EMPLOYMENT_TYPE_LABELS: Record<JobEmploymentType, string> = {
  fullTime: 'Full-time',
  partTime: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}

export const JOB_EMPLOYMENT_TYPE_OPTIONS = JOB_EMPLOYMENT_TYPES.map((value) => ({
  label: JOB_EMPLOYMENT_TYPE_LABELS[value],
  value,
}))

export const JOB_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type JobPriority = (typeof JOB_PRIORITIES)[number]

export const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const JOB_PRIORITY_OPTIONS = JOB_PRIORITIES.map((value) => ({
  label: JOB_PRIORITY_LABELS[value],
  value,
}))

export const JOB_STATUSES = ['active', 'onHold', 'closed', 'inactive'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  active: 'Active',
  onHold: 'On Hold',
  closed: 'Closed',
  inactive: 'Inactive',
}

export const JOB_STATUS_OPTIONS = JOB_STATUSES.map((value) => ({
  label: JOB_STATUS_LABELS[value],
  value,
}))

export const ACTIVE_JOB_STATUSES = ['active', 'onHold'] as const
export const REACTIVATABLE_JOB_STATUSES = ['inactive', 'closed'] as const

export const JOB_REQUEST_SOURCES = ['email', 'phone', 'portal', 'manual'] as const
export type JobRequestSource = (typeof JOB_REQUEST_SOURCES)[number]

export const JOB_REQUEST_SOURCE_LABELS: Record<JobRequestSource, string> = {
  email: 'Email',
  phone: 'Phone',
  portal: 'Portal',
  manual: 'Manual',
}

export const JOB_REQUEST_SOURCE_OPTIONS = JOB_REQUEST_SOURCES.map((value) => ({
  label: JOB_REQUEST_SOURCE_LABELS[value],
  value,
}))

export const JOB_REQUEST_STATUSES = [
  'new',
  'underReview',
  'approved',
  'rejected',
  'converted',
  'duplicateActive',
  'reactivated',
] as const
export type JobRequestStatus = (typeof JOB_REQUEST_STATUSES)[number]

export const JOB_REQUEST_STATUS_LABELS: Record<JobRequestStatus, string> = {
  new: 'New',
  underReview: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  converted: 'Converted',
  duplicateActive: 'Duplicate Active',
  reactivated: 'Reactivated',
}

export const JOB_REQUEST_STATUS_OPTIONS = JOB_REQUEST_STATUSES.map((value) => ({
  label: JOB_REQUEST_STATUS_LABELS[value],
  value,
}))

export const ASSIGNMENT_STATUSES = ['active', 'inactive'] as const
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

export const ASSIGNMENT_STATUS_OPTIONS = ASSIGNMENT_STATUSES.map((value) => ({
  label: ASSIGNMENT_STATUS_LABELS[value],
  value,
}))

export const CANDIDATE_SOURCES = [
  'naukri',
  'linkedin',
  'reference',
  'careerPortal',
  'walkIn',
  'consultancy',
  'database',
  'other',
] as const
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number]

export const CANDIDATE_SOURCE_LABELS: Record<CandidateSource, string> = {
  naukri: 'Naukri',
  linkedin: 'LinkedIn',
  reference: 'Reference',
  careerPortal: 'Career Portal',
  walkIn: 'Walk-in',
  consultancy: 'Consultancy',
  database: 'Database',
  other: 'Other',
}

export const CANDIDATE_SOURCE_OPTIONS = CANDIDATE_SOURCES.map((value) => ({
  label: CANDIDATE_SOURCE_LABELS[value],
  value,
}))

export const CANDIDATE_INVITE_STATUSES = ['pending', 'consumed', 'expired', 'revoked'] as const
export type CandidateInviteStatus = (typeof CANDIDATE_INVITE_STATUSES)[number]

export const CANDIDATE_INVITE_STATUS_LABELS: Record<CandidateInviteStatus, string> = {
  pending: 'Pending',
  consumed: 'Consumed',
  expired: 'Expired',
  revoked: 'Revoked',
}

export const CANDIDATE_INVITE_STATUS_OPTIONS = CANDIDATE_INVITE_STATUSES.map((value) => ({
  label: CANDIDATE_INVITE_STATUS_LABELS[value],
  value,
}))

export const APPLICATION_STAGES = [
  'sourcedByRecruiter',
  'internalReviewPending',
  'internalReviewApproved',
  'internalReviewRejected',
  'sentBackForCorrection',
  'candidateInvited',
  'candidateApplied',
] as const
export type ApplicationStage = (typeof APPLICATION_STAGES)[number]

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  sourcedByRecruiter: 'Sourced by Recruiter',
  internalReviewPending: 'Internal Review Pending',
  internalReviewApproved: 'Internal Review Approved',
  internalReviewRejected: 'Internal Review Rejected',
  sentBackForCorrection: 'Sent Back for Correction',
  candidateInvited: 'Candidate Invited',
  candidateApplied: 'Candidate Applied',
}

export const APPLICATION_STAGE_OPTIONS = APPLICATION_STAGES.map((value) => ({
  label: APPLICATION_STAGE_LABELS[value],
  value,
}))
