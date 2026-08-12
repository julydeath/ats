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

export const CANDIDATE_RESUME_IMPORT_BATCH_STATUSES = [
  'queued',
  'processing',
  'readyForReview',
  'completed',
  'completedWithErrors',
  'failed',
] as const
export type CandidateResumeImportBatchStatus =
  (typeof CANDIDATE_RESUME_IMPORT_BATCH_STATUSES)[number]

export const CANDIDATE_RESUME_IMPORT_BATCH_STATUS_LABELS: Record<
  CandidateResumeImportBatchStatus,
  string
> = {
  queued: 'Queued',
  processing: 'Processing',
  readyForReview: 'Ready for Review',
  completed: 'Completed',
  completedWithErrors: 'Completed with Errors',
  failed: 'Failed',
}

export const CANDIDATE_RESUME_IMPORT_BATCH_STATUS_OPTIONS =
  CANDIDATE_RESUME_IMPORT_BATCH_STATUSES.map((value) => ({
    label: CANDIDATE_RESUME_IMPORT_BATCH_STATUS_LABELS[value],
    value,
  }))

export const CANDIDATE_RESUME_IMPORT_ITEM_STATUSES = [
  'queued',
  'processing',
  'needsReview',
  'candidateCreated',
  'failed',
] as const
export type CandidateResumeImportItemStatus = (typeof CANDIDATE_RESUME_IMPORT_ITEM_STATUSES)[number]

export const CANDIDATE_RESUME_IMPORT_ITEM_STATUS_LABELS: Record<
  CandidateResumeImportItemStatus,
  string
> = {
  queued: 'Queued',
  processing: 'Processing',
  needsReview: 'Needs Review',
  candidateCreated: 'Candidate Created',
  failed: 'Failed',
}

export const CANDIDATE_RESUME_IMPORT_ITEM_STATUS_OPTIONS =
  CANDIDATE_RESUME_IMPORT_ITEM_STATUSES.map((value) => ({
    label: CANDIDATE_RESUME_IMPORT_ITEM_STATUS_LABELS[value],
    value,
  }))

export const APPLICATION_STAGES = [
  'sourced',
  'screened',
  'internalRejected',
  'submittedToClient',
  'clientRejected',
  'l1Scheduled',
  'l1Rejected',
  'l2Scheduled',
  'l2Rejected',
  'l3Scheduled',
  'l3Rejected',
  'hrDiscussion',
] as const
export type ApplicationStage = (typeof APPLICATION_STAGES)[number]

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  sourced: 'Sourced',
  screened: 'Screened',
  internalRejected: 'Internal Rejected',
  submittedToClient: 'Submitted to Client',
  clientRejected: 'Client Rejected',
  l1Scheduled: 'L1 Scheduled',
  l1Rejected: 'L1 Rejected',
  l2Scheduled: 'L2 Scheduled',
  l2Rejected: 'L2 Rejected',
  l3Scheduled: 'L3 Scheduled',
  l3Rejected: 'L3 Rejected',
  hrDiscussion: 'HR Discussion',
}

export const APPLICATION_STAGE_OPTIONS = APPLICATION_STAGES.map((value) => ({
  label: APPLICATION_STAGE_LABELS[value],
  value,
}))

export type ApplicationWorkflowRole = 'admin' | 'leadRecruiter' | 'recruiter'

export const APPLICATION_REJECTION_STAGES = [
  'internalRejected',
  'clientRejected',
  'l1Rejected',
  'l2Rejected',
  'l3Rejected',
] as const satisfies readonly ApplicationStage[]

export const APPLICATION_INTERVIEW_STAGES = [
  'l1Scheduled',
  'l2Scheduled',
  'l3Scheduled',
] as const satisfies readonly ApplicationStage[]

export const APPLICATION_FORWARD_STAGES = [
  'sourced',
  'screened',
  'submittedToClient',
  'l1Scheduled',
  'l2Scheduled',
  'l3Scheduled',
  'hrDiscussion',
] as const satisfies readonly ApplicationStage[]

export const APPLICATION_INVITE_READY_STAGES = [
  'screened',
  'submittedToClient',
  'l1Scheduled',
  'l2Scheduled',
  'l3Scheduled',
  'hrDiscussion',
] as const satisfies readonly ApplicationStage[]

export const APPLICATION_INTERVIEW_READY_STAGES = [
  'submittedToClient',
  'l1Scheduled',
  'l2Scheduled',
  'l3Scheduled',
] as const satisfies readonly ApplicationStage[]

export const APPLICATION_PLACEMENT_READY_STAGES = ['hrDiscussion'] as const satisfies readonly ApplicationStage[]

const APPLICATION_RECRUITER_TRANSITIONS: Partial<Record<ApplicationStage, ApplicationStage[]>> = {
  screened: ['submittedToClient'],
  submittedToClient: ['clientRejected', 'l1Scheduled'],
  l1Scheduled: ['l1Rejected', 'l2Scheduled'],
  l2Scheduled: ['l2Rejected', 'l3Scheduled'],
  l3Scheduled: ['l3Rejected', 'hrDiscussion'],
}

const APPLICATION_LEAD_TRANSITION_OVERRIDES: Partial<Record<ApplicationStage, ApplicationStage[]>> = {
  sourced: ['screened', 'internalRejected'],
  screened: ['sourced', 'submittedToClient', 'internalRejected'],
}

export const APPLICATION_PRIMARY_NEXT_STAGE: Partial<Record<ApplicationStage, ApplicationStage>> = {
  sourced: 'screened',
  screened: 'submittedToClient',
  submittedToClient: 'l1Scheduled',
  l1Scheduled: 'l2Scheduled',
  l2Scheduled: 'l3Scheduled',
  l3Scheduled: 'hrDiscussion',
}

export const getApplicationStageTargets = ({
  role,
  stage,
}: {
  role: ApplicationWorkflowRole
  stage: ApplicationStage
}): ApplicationStage[] => {
  if (role === 'admin') {
    return APPLICATION_STAGES.filter((item) => item !== stage)
  }

  if (role === 'recruiter') {
    return APPLICATION_RECRUITER_TRANSITIONS[stage] || []
  }

  if (role === 'leadRecruiter') {
    return APPLICATION_LEAD_TRANSITION_OVERRIDES[stage] || APPLICATION_RECRUITER_TRANSITIONS[stage] || []
  }

  return []
}

export const getApplicationPrimaryNextStage = (stage: ApplicationStage): ApplicationStage | null =>
  APPLICATION_PRIMARY_NEXT_STAGE[stage] || null

export const getApplicationRejectionTarget = (stage: ApplicationStage): ApplicationStage | null => {
  if (stage === 'sourced' || stage === 'screened') return 'internalRejected'
  if (stage === 'submittedToClient') return 'clientRejected'
  if (stage === 'l1Scheduled') return 'l1Rejected'
  if (stage === 'l2Scheduled') return 'l2Rejected'
  if (stage === 'l3Scheduled') return 'l3Rejected'
  return null
}

export const isApplicationRejectedStage = (stage: unknown): stage is (typeof APPLICATION_REJECTION_STAGES)[number] =>
  typeof stage === 'string' && APPLICATION_REJECTION_STAGES.includes(stage as (typeof APPLICATION_REJECTION_STAGES)[number])

export const isApplicationActiveStage = (stage: unknown): stage is ApplicationStage =>
  typeof stage === 'string' &&
  APPLICATION_STAGES.includes(stage as ApplicationStage) &&
  !isApplicationRejectedStage(stage)

const LEGACY_APPLICATION_STAGE_MAP: Record<string, ApplicationStage> = {
  candidateApplied: 'hrDiscussion',
  candidateInvited: 'l1Scheduled',
  clientRejected: 'clientRejected',
  hrDiscussion: 'hrDiscussion',
  internalRejected: 'internalRejected',
  internalReviewApproved: 'screened',
  internalReviewPending: 'sourced',
  internalReviewRejected: 'internalRejected',
  interviewCleared: 'l2Scheduled',
  interviewScheduled: 'l1Scheduled',
  joined: 'hrDiscussion',
  l1Rejected: 'l1Rejected',
  l1Scheduled: 'l1Scheduled',
  l2Rejected: 'l2Rejected',
  l2Scheduled: 'l2Scheduled',
  l3Rejected: 'l3Rejected',
  l3Scheduled: 'l3Scheduled',
  offerReleased: 'hrDiscussion',
  rejected: 'internalRejected',
  sentBackForCorrection: 'sourced',
  sourcedByRecruiter: 'sourced',
}

export const normalizeApplicationStage = (value: unknown): ApplicationStage | null => {
  if (typeof value !== 'string') {
    return null
  }

  if (APPLICATION_STAGES.includes(value as ApplicationStage)) {
    return value as ApplicationStage
  }

  return LEGACY_APPLICATION_STAGE_MAP[value] || null
}

export const INTERVIEW_ROUNDS = ['screening', 'technicalRound1', 'technicalRound2', 'managerial', 'hr', 'final'] as const
export type InterviewRound = (typeof INTERVIEW_ROUNDS)[number]

export const INTERVIEW_ROUND_LABELS: Record<InterviewRound, string> = {
  screening: 'Screening',
  technicalRound1: 'Technical Round 1',
  technicalRound2: 'Technical Round 2',
  managerial: 'Managerial',
  hr: 'HR',
  final: 'Final',
}

export const INTERVIEW_ROUND_OPTIONS = INTERVIEW_ROUNDS.map((value) => ({
  label: INTERVIEW_ROUND_LABELS[value],
  value,
}))

export const INTERVIEW_STATUSES = ['scheduled', 'rescheduled', 'completed', 'cancelled', 'noShow'] as const
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number]

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: 'Scheduled',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  noShow: 'No Show',
}

export const INTERVIEW_STATUS_OPTIONS = INTERVIEW_STATUSES.map((value) => ({
  label: INTERVIEW_STATUS_LABELS[value],
  value,
}))

export const INTERVIEW_MODES = ['video', 'inPerson', 'phone'] as const
export type InterviewMode = (typeof INTERVIEW_MODES)[number]

export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  video: 'Video',
  inPerson: 'In-person',
  phone: 'Phone',
}

export const INTERVIEW_MODE_OPTIONS = INTERVIEW_MODES.map((value) => ({
  label: INTERVIEW_MODE_LABELS[value],
  value,
}))

export const PLACEMENT_TYPES = ['recurringRevenue', 'oneTimeRevenue', 'inHouse'] as const
export type PlacementType = (typeof PLACEMENT_TYPES)[number]

export const PLACEMENT_TYPE_LABELS: Record<PlacementType, string> = {
  recurringRevenue: 'Recurring Revenue',
  oneTimeRevenue: 'One Time Revenue',
  inHouse: 'In-house',
}

export const PLACEMENT_TYPE_OPTIONS = PLACEMENT_TYPES.map((value) => ({
  label: PLACEMENT_TYPE_LABELS[value],
  value,
}))

export const PLACEMENT_STATUSES = ['active', 'inactive', 'completed', 'cancelled'] as const
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number]

export const PLACEMENT_STATUS_LABELS: Record<PlacementStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const PLACEMENT_STATUS_OPTIONS = PLACEMENT_STATUSES.map((value) => ({
  label: PLACEMENT_STATUS_LABELS[value],
  value,
}))

export const CANDIDATE_ACTIVITY_TYPES = ['note', 'task', 'message', 'activity'] as const
export type CandidateActivityType = (typeof CANDIDATE_ACTIVITY_TYPES)[number]

export const CANDIDATE_ACTIVITY_TYPE_LABELS: Record<CandidateActivityType, string> = {
  note: 'Note',
  task: 'Task',
  message: 'Message',
  activity: 'Activity',
}

export const CANDIDATE_ACTIVITY_TYPE_OPTIONS = CANDIDATE_ACTIVITY_TYPES.map((value) => ({
  label: CANDIDATE_ACTIVITY_TYPE_LABELS[value],
  value,
}))

export const CANDIDATE_ACTIVITY_STATUSES = ['open', 'inProgress', 'completed', 'cancelled'] as const
export type CandidateActivityStatus = (typeof CANDIDATE_ACTIVITY_STATUSES)[number]

export const CANDIDATE_ACTIVITY_STATUS_LABELS: Record<CandidateActivityStatus, string> = {
  open: 'Open',
  inProgress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const CANDIDATE_ACTIVITY_STATUS_OPTIONS = CANDIDATE_ACTIVITY_STATUSES.map((value) => ({
  label: CANDIDATE_ACTIVITY_STATUS_LABELS[value],
  value,
}))

export const CANDIDATE_ACTIVITY_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type CandidateActivityPriority = (typeof CANDIDATE_ACTIVITY_PRIORITIES)[number]

export const CANDIDATE_ACTIVITY_PRIORITY_LABELS: Record<CandidateActivityPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const CANDIDATE_ACTIVITY_PRIORITY_OPTIONS = CANDIDATE_ACTIVITY_PRIORITIES.map((value) => ({
  label: CANDIDATE_ACTIVITY_PRIORITY_LABELS[value],
  value,
}))
