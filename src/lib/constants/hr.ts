export const EMPLOYMENT_STATUSES = ['active', 'inactive', 'onNotice', 'terminated'] as const
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  onNotice: 'On Notice',
  terminated: 'Terminated',
}

export const EMPLOYMENT_STATUS_OPTIONS = EMPLOYMENT_STATUSES.map((value) => ({
  label: EMPLOYMENT_STATUS_LABELS[value],
  value,
}))

export const WEEKDAY_OPTIONS = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
] as const

export const ATTENDANCE_SOURCES = ['web', 'mobileWeb'] as const
export type AttendanceSource = (typeof ATTENDANCE_SOURCES)[number]

export const ATTENDANCE_SOURCE_LABELS: Record<AttendanceSource, string> = {
  web: 'Web',
  mobileWeb: 'Mobile Web',
}

export const ATTENDANCE_SOURCE_OPTIONS = ATTENDANCE_SOURCES.map((value) => ({
  label: ATTENDANCE_SOURCE_LABELS[value],
  value,
}))

export const ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'halfDay',
  'leave',
  'holiday',
  'weekOff',
] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  halfDay: 'Half Day',
  leave: 'Leave',
  holiday: 'Holiday',
  weekOff: 'Week Off',
}

export const ATTENDANCE_STATUS_OPTIONS = ATTENDANCE_STATUSES.map((value) => ({
  label: ATTENDANCE_STATUS_LABELS[value],
  value,
}))

export const HOLIDAY_TYPES = ['national', 'festival', 'company'] as const
export type HolidayType = (typeof HOLIDAY_TYPES)[number]

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  national: 'National',
  festival: 'Festival',
  company: 'Company',
}

export const HOLIDAY_TYPE_OPTIONS = HOLIDAY_TYPES.map((value) => ({
  label: HOLIDAY_TYPE_LABELS[value],
  value,
}))

export const LEAVE_TYPE_KEYS = ['CL', 'SL', 'EL'] as const
export type LeaveTypeKey = (typeof LEAVE_TYPE_KEYS)[number]

export const LEAVE_TYPE_KEY_LABELS: Record<LeaveTypeKey, string> = {
  CL: 'Casual Leave',
  SL: 'Sick Leave',
  EL: 'Earned Leave',
}

export const LEAVE_TYPE_KEY_OPTIONS = LEAVE_TYPE_KEYS.map((value) => ({
  label: LEAVE_TYPE_KEY_LABELS[value],
  value,
}))

export const LEAVE_UNITS = ['fullDay', 'halfDay'] as const
export type LeaveUnit = (typeof LEAVE_UNITS)[number]

export const LEAVE_UNIT_LABELS: Record<LeaveUnit, string> = {
  fullDay: 'Full Day',
  halfDay: 'Half Day',
}

export const LEAVE_UNIT_OPTIONS = LEAVE_UNITS.map((value) => ({
  label: LEAVE_UNIT_LABELS[value],
  value,
}))

export const LEAVE_REQUEST_STATUSES = [
  'pendingLeadApproval',
  'pendingAdminApproval',
  'approved',
  'rejected',
  'cancelled',
] as const
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number]

export const LEAVE_REQUEST_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pendingLeadApproval: 'Pending Lead Approval',
  pendingAdminApproval: 'Pending Admin Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export const LEAVE_REQUEST_STATUS_OPTIONS = LEAVE_REQUEST_STATUSES.map((value) => ({
  label: LEAVE_REQUEST_STATUS_LABELS[value],
  value,
}))

export const PERFORMANCE_CYCLE_STATUSES = ['open', 'closed', 'archived'] as const
export type PerformanceCycleStatus = (typeof PERFORMANCE_CYCLE_STATUSES)[number]

export const PERFORMANCE_CYCLE_STATUS_LABELS: Record<PerformanceCycleStatus, string> = {
  open: 'Open',
  closed: 'Closed',
  archived: 'Archived',
}

export const PERFORMANCE_CYCLE_STATUS_OPTIONS = PERFORMANCE_CYCLE_STATUSES.map((value) => ({
  label: PERFORMANCE_CYCLE_STATUS_LABELS[value],
  value,
}))

export const PERFORMANCE_REVIEW_STATUSES = ['draft', 'submitted', 'finalized'] as const
export type PerformanceReviewStatus = (typeof PERFORMANCE_REVIEW_STATUSES)[number]

export const PERFORMANCE_REVIEW_STATUS_LABELS: Record<PerformanceReviewStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  finalized: 'Finalized',
}

export const PERFORMANCE_REVIEW_STATUS_OPTIONS = PERFORMANCE_REVIEW_STATUSES.map((value) => ({
  label: PERFORMANCE_REVIEW_STATUS_LABELS[value],
  value,
}))

export const PAYROLL_CYCLE_STATUSES = ['draft', 'open', 'closed'] as const
export type PayrollCycleStatus = (typeof PAYROLL_CYCLE_STATUSES)[number]

export const PAYROLL_CYCLE_STATUS_LABELS: Record<PayrollCycleStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
}

export const PAYROLL_CYCLE_STATUS_OPTIONS = PAYROLL_CYCLE_STATUSES.map((value) => ({
  label: PAYROLL_CYCLE_STATUS_LABELS[value],
  value,
}))

export const PAYROLL_RUN_STATUSES = [
  'draft',
  'locked',
  'approved',
  'disbursing',
  'completed',
  'failed',
  'cancelled',
] as const
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number]

export const PAYROLL_RUN_STATUS_LABELS: Record<PayrollRunStatus, string> = {
  draft: 'Draft',
  locked: 'Locked',
  approved: 'Approved',
  disbursing: 'Disbursing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export const PAYROLL_RUN_STATUS_OPTIONS = PAYROLL_RUN_STATUSES.map((value) => ({
  label: PAYROLL_RUN_STATUS_LABELS[value],
  value,
}))

export const PAYOUT_STATUSES = [
  'created',
  'processing',
  'processed',
  'failed',
  'reversed',
  'cancelled',
] as const
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number]

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  created: 'Created',
  processing: 'Processing',
  processed: 'Processed',
  failed: 'Failed',
  reversed: 'Reversed',
  cancelled: 'Cancelled',
}

export const PAYOUT_STATUS_OPTIONS = PAYOUT_STATUSES.map((value) => ({
  label: PAYOUT_STATUS_LABELS[value],
  value,
}))

export const TAX_REGIMES = ['old', 'new'] as const
export type TaxRegime = (typeof TAX_REGIMES)[number]

export const TAX_REGIME_OPTIONS = TAX_REGIMES.map((value) => ({
  label: value === 'old' ? 'Old Regime' : 'New Regime',
  value,
}))

export const PERFORMANCE_DEFAULT_KPI_WEIGHT = 70
export const PERFORMANCE_DEFAULT_MANAGER_WEIGHT = 30

export const PAYROLL_DEFAULT_MONTH_START_DAY = 1
