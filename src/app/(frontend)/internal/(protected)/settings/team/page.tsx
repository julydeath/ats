import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { HOLIDAY_TYPE_OPTIONS, WEEKDAY_OPTIONS } from '@/lib/constants/hr'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'
import { extractRelationshipID } from '@/lib/utils/relationships'

type TeamManagementPageProps = {
  searchParams?: Promise<{
    error?: string
    success?: string
  }>
}

const formatMoney = (value?: number | null): string =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value || 0)

const todayISO = (): string => new Date().toISOString().slice(0, 10)
const currentYear = (): number => new Date().getFullYear()

const toNumberID = (value: number | string | null | undefined): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return null
}

const readLabel = (value: unknown, fallback = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as {
      email?: string
      fullName?: string
      name?: string
      role?: 'admin' | 'leadRecruiter' | 'recruiter' | null
    }

    return typed.fullName || typed.name || typed.email || fallback
  }

  return fallback
}

const parseSuccess = (value?: string): string | null => {
  if (!value) return null
  if (value === 'memberCreated') return 'Team member created with onboarding profile.'
  if (value === 'compensationSaved') return 'Compensation profile saved successfully.'
  if (value === 'shiftCreated') return 'Attendance shift created successfully.'
  if (value === 'shiftRemoved') return 'Attendance shift removed successfully.'
  if (value === 'holidayCalendarCreated') return 'Holiday calendar created successfully.'
  if (value === 'holidayAdded') return 'Holiday added to calendar successfully.'
  if (value === 'holidayRemoved') return 'Holiday removed from calendar successfully.'
  if (value === 'memberActivated') return 'Team member activated.'
  if (value === 'memberDeactivated') return 'Team member deactivated.'
  return null
}

export default async function TeamManagementPage({ searchParams }: TeamManagementPageProps) {
  const currentUser = await requireInternalRole(['admin', 'leadRecruiter'])
  const payload = await getPayload({ config: configPromise })
  const params = (await searchParams) || {}

  const usersResult = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 250,
    overrideAccess: false,
    pagination: false,
    select: {
      email: true,
      fullName: true,
      id: true,
      isActive: true,
      role: true,
    },
    sort: 'fullName',
    user: currentUser,
    where:
      currentUser.role === 'leadRecruiter'
        ? {
            or: [
              {
                id: {
                  equals: currentUser.id,
                },
              },
              {
                role: {
                  equals: 'recruiter',
                },
              },
            ],
          }
        : undefined,
  })

  const visibleUserIDs = new Set(
    usersResult.docs
      .map((item) => toNumberID(item.id))
      .filter((id): id is number => id !== null),
  )

  const [employeeProfilesResult, shiftsResult, holidaysResult, activeCompensationResult] = await Promise.all([
    payload.find({
      collection: 'employee-profiles',
      depth: 1,
      limit: 300,
      overrideAccess: false,
      pagination: false,
      select: {
        dateOfJoining: true,
        designation: true,
        employeeCode: true,
        employmentStatus: true,
        id: true,
        payoutReady: true,
        reportingManager: true,
        user: true,
        workLocation: true,
        workState: true,
      },
      sort: '-updatedAt',
      user: currentUser,
    }),
    payload.find({
      collection: 'attendance-shifts',
      depth: 0,
      limit: 100,
      overrideAccess: false,
      pagination: false,
      select: {
        id: true,
        name: true,
        shiftCode: true,
      },
      sort: 'name',
      user: currentUser,
    }),
    payload.find({
      collection: 'holiday-calendars',
      depth: 0,
      limit: 100,
      overrideAccess: false,
      pagination: false,
      select: {
        calendarCode: true,
        holidays: true,
        id: true,
        name: true,
        state: true,
        year: true,
      },
      sort: 'name',
      user: currentUser,
    }),
    currentUser.role === 'admin'
      ? payload.find({
          collection: 'employee-compensation',
          depth: 0,
          limit: 500,
          overrideAccess: false,
          pagination: false,
          select: {
            employee: true,
            id: true,
            isActive: true,
            monthlyGross: true,
          },
          sort: '-effectiveFrom',
          user: currentUser,
          where: {
            isActive: {
              equals: true,
            },
          },
        })
      : Promise.resolve({
          docs: [] as Array<{
            employee?: number | string | null
            id: number | string
            isActive?: boolean | null
            monthlyGross?: number | null
          }>,
        }),
  ])

  const profileByUserID = new Map<
    number | string,
    (typeof employeeProfilesResult.docs)[number]
  >()

  employeeProfilesResult.docs.forEach((profile) => {
    const mappedUserID = toNumberID(extractRelationshipID(profile.user))
    if (!mappedUserID) return
    if (!visibleUserIDs.has(mappedUserID)) return
    profileByUserID.set(mappedUserID, profile)
  })

  const compensationByEmployeeID = new Map<number | string, (typeof activeCompensationResult.docs)[number]>()
  activeCompensationResult.docs.forEach((item) => {
    const employeeID = toNumberID(extractRelationshipID(item.employee))
    if (!employeeID || compensationByEmployeeID.has(employeeID)) return
    compensationByEmployeeID.set(employeeID, item)
  })

  const visibleProfiles = employeeProfilesResult.docs.filter((profile) => {
    const mappedUserID = toNumberID(extractRelationshipID(profile.user))
    return Boolean(mappedUserID && visibleUserIDs.has(mappedUserID))
  })

  const managerCandidates = usersResult.docs.filter((member) =>
    member.role === 'admin' || member.role === 'leadRecruiter',
  )

  const successMessage = parseSuccess(params.success)
  const totalMembersCount = usersResult.docs.length
  const activeMembersCount = usersResult.docs.filter((member) => member.isActive).length
  const pendingMembersCount = totalMembersCount - activeMembersCount
  const profileReadyCount = usersResult.docs.filter((member) => profileByUserID.has(member.id)).length
  const payoutReadyCount = visibleProfiles.filter((profile) => profile.payoutReady).length
  const compensationConfiguredCount = visibleProfiles.filter((profile) =>
    compensationByEmployeeID.has(profile.id),
  ).length

  return (
    <section className="dashboard-grid team-mgmt-page">
      <article className="panel panel-span-2 team-mgmt-hero">
        <div className="team-mgmt-header-row">
          <div>
            <p className="eyebrow">Settings · Team</p>
            <h1>Team Management</h1>
            <p className="panel-intro">
              Create team members, complete onboarding, activate accounts, and manage payroll readiness from one place.
            </p>
          </div>
          <div className="team-mgmt-header-actions">
            <Link className="button button-secondary" href={APP_ROUTES.internal.settings}>
              Back to Settings
            </Link>
            {currentUser.role === 'admin' ? (
              <Link className="button button-secondary" href={APP_ROUTES.internal.hr.payroll}>
                Open Payroll
              </Link>
            ) : null}
          </div>
        </div>
        {successMessage ? (
          <p className="team-mgmt-feedback team-mgmt-feedback-success">{successMessage}</p>
        ) : null}
        {params.error ? <p className="team-mgmt-feedback team-mgmt-feedback-error">Error: {params.error}</p> : null}
      </article>

      <article className="panel panel-span-2 team-mgmt-kpi-panel">
        <div className="team-mgmt-kpi-grid">
          <div className="team-mgmt-kpi-card">
            <p>Total Team Members</p>
            <strong>{totalMembersCount}</strong>
            <small>Admin + lead + recruiters in scope</small>
          </div>
          <div className="team-mgmt-kpi-card">
            <p>Active Accounts</p>
            <strong>{activeMembersCount}</strong>
            <small>{pendingMembersCount} pending activation</small>
          </div>
          <div className="team-mgmt-kpi-card">
            <p>Profiles Completed</p>
            <strong>{profileReadyCount}</strong>
            <small>{Math.max(totalMembersCount - profileReadyCount, 0)} missing onboarding profile</small>
          </div>
          <div className="team-mgmt-kpi-card">
            <p>{currentUser.role === 'admin' ? 'Compensation Configured' : 'Payroll Ready'}</p>
            <strong>{currentUser.role === 'admin' ? compensationConfiguredCount : payoutReadyCount}</strong>
            <small>
              {currentUser.role === 'admin'
                ? `${payoutReadyCount} marked payout ready`
                : 'Visible for your team only'}
            </small>
          </div>
        </div>
      </article>

      {currentUser.role === 'admin' ? (
        <article className="panel panel-span-2 team-mgmt-panel">
          <h2>Attendance & Holiday Setup</h2>
          <p className="panel-subtitle">
            Create attendance shifts and holiday calendars here before onboarding employees.
          </p>
          <div className="team-mgmt-setup-grid">
            <section className="team-mgmt-setup-card">
              <h3>Create Attendance Shift</h3>
              <form action={APP_ROUTES.internal.team.createShift} className="team-mgmt-form" method="post">
                <div className="team-mgmt-form-grid">
                  <label className="team-mgmt-field">
                    <span>Shift Name</span>
                    <input className="input" name="name" placeholder="General Shift" required type="text" />
                  </label>
                  <label className="team-mgmt-field">
                    <span>Start Time</span>
                    <input className="input" defaultValue="09:30" name="shiftStartTime" required type="time" />
                  </label>
                  <label className="team-mgmt-field">
                    <span>End Time</span>
                    <input className="input" defaultValue="18:30" name="shiftEndTime" required type="time" />
                  </label>
                  <label className="team-mgmt-field">
                    <span>Grace (Minutes)</span>
                    <input className="input" defaultValue={15} min={0} name="graceMinutes" required type="number" />
                  </label>
                  <label className="team-mgmt-field">
                    <span>Half Day Threshold</span>
                    <input
                      className="input"
                      defaultValue={240}
                      min={0}
                      name="halfDayThresholdMinutes"
                      required
                      type="number"
                    />
                  </label>
                  <label className="team-mgmt-field">
                    <span>Full Day Threshold</span>
                    <input
                      className="input"
                      defaultValue={480}
                      min={0}
                      name="fullDayThresholdMinutes"
                      required
                      type="number"
                    />
                  </label>
                  <label className="team-mgmt-field">
                    <span>Overtime Threshold</span>
                    <input
                      className="input"
                      defaultValue={540}
                      min={0}
                      name="overtimeThresholdMinutes"
                      required
                      type="number"
                    />
                  </label>
                  <label className="team-mgmt-field team-mgmt-field-span-2">
                    <span>Notes</span>
                    <input className="input" name="notes" placeholder="Optional notes..." type="text" />
                  </label>
                </div>
                <div className="team-mgmt-checkbox-grid">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <label className="team-mgmt-checkbox" key={`weekly-off-${day.value}`}>
                      <input defaultChecked={day.value === 'sunday'} name="weeklyOffDays" type="checkbox" value={day.value} />
                      <span>{day.label}</span>
                    </label>
                  ))}
                  <label className="team-mgmt-checkbox">
                    <input name="isDefault" type="checkbox" />
                    <span>Set as default shift</span>
                  </label>
                </div>
                <div className="team-mgmt-form-actions">
                  <button className="button" type="submit">
                    Create Shift
                  </button>
                </div>
              </form>
              <div className="team-mgmt-setup-list">
                <p>Available Shifts</p>
                {shiftsResult.docs.length === 0 ? (
                  <small>No shifts found.</small>
                ) : (
                  shiftsResult.docs.slice(0, 8).map((shift) => (
                    <div className="team-mgmt-inline-row" key={`shift-list-${shift.id}`}>
                      <small>
                        {shift.shiftCode} · {shift.name}
                      </small>
                      <form action={APP_ROUTES.internal.team.deleteShift} method="post">
                        <input name="shiftId" type="hidden" value={shift.id} />
                        <button className="button button-secondary" type="submit">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="team-mgmt-setup-card">
              <h3>Create Holiday Calendar</h3>
              <form action={APP_ROUTES.internal.team.createHolidayCalendar} className="team-mgmt-form" method="post">
                <div className="team-mgmt-form-grid">
                  <label className="team-mgmt-field">
                    <span>Calendar Name</span>
                    <input className="input" name="name" placeholder="India - Telangana" required type="text" />
                  </label>
                  <label className="team-mgmt-field">
                    <span>State</span>
                    <input className="input" defaultValue="Telangana" name="state" required type="text" />
                  </label>
                  <label className="team-mgmt-field">
                    <span>Year</span>
                    <input className="input" defaultValue={currentYear()} max={2200} min={2000} name="year" required type="number" />
                  </label>
                </div>
                <div className="team-mgmt-form-actions">
                  <button className="button" type="submit">
                    Create Calendar
                  </button>
                </div>
              </form>
              <div className="team-mgmt-setup-list">
                <p>Available Calendars</p>
                {holidaysResult.docs.length === 0 ? (
                  <small>No holiday calendars found.</small>
                ) : (
                  holidaysResult.docs.slice(0, 6).map((calendar) => (
                    <details className="team-mgmt-calendar-card" key={`calendar-list-${calendar.id}`}>
                      <summary>
                        {calendar.calendarCode} · {calendar.name} ({calendar.state}, {calendar.year})
                      </summary>
                      <form action={APP_ROUTES.internal.team.addHolidayToCalendar} className="team-mgmt-form" method="post">
                        <input name="calendarId" type="hidden" value={calendar.id} />
                        <div className="team-mgmt-form-grid">
                          <label className="team-mgmt-field">
                            <span>Holiday Name</span>
                            <input className="input" name="holidayName" placeholder="Republic Day" required type="text" />
                          </label>
                          <label className="team-mgmt-field">
                            <span>Holiday Date</span>
                            <input className="input" name="holidayDate" required type="date" />
                          </label>
                          <label className="team-mgmt-field">
                            <span>Holiday Type</span>
                            <select className="input" defaultValue="national" name="holidayType">
                              {HOLIDAY_TYPE_OPTIONS.map((option) => (
                                <option key={`holiday-type-${calendar.id}-${option.value}`} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="team-mgmt-form-actions">
                          <button className="button" type="submit">
                            Add Holiday
                          </button>
                        </div>
                      </form>
                      <div className="team-mgmt-holiday-list">
                        {Array.isArray((calendar as { holidays?: unknown[] }).holidays) &&
                        (calendar as { holidays?: unknown[] }).holidays!.length > 0 ? (
                          (calendar as { holidays?: Array<{ date?: string; name?: string; type?: string }> }).holidays!.map((holiday) => (
                            <div
                              className="team-mgmt-inline-row"
                              key={`holiday-${calendar.id}-${holiday.date || ''}-${holiday.name || ''}`}
                            >
                              <small>
                                {holiday.name || 'Holiday'} · {holiday.date ? new Date(holiday.date).toLocaleDateString('en-IN') : 'No date'} · {holiday.type || 'type'}
                              </small>
                              <form action={APP_ROUTES.internal.team.deleteHolidayFromCalendar} method="post">
                                <input name="calendarId" type="hidden" value={calendar.id} />
                                <input name="holidayDate" type="hidden" value={holiday.date || ''} />
                                <input name="holidayName" type="hidden" value={holiday.name || ''} />
                                <button className="button button-secondary" type="submit">
                                  Delete
                                </button>
                              </form>
                            </div>
                          ))
                        ) : (
                          <small>No holidays added yet.</small>
                        )}
                      </div>
                    </details>
                  ))
                )}
              </div>
            </section>
          </div>
        </article>
      ) : null}

      <article className="panel team-mgmt-panel">
        <h2>Create Team Member</h2>
        <p className="panel-subtitle">
          {currentUser.role === 'admin'
            ? 'Admin can create lead or recruiter accounts.'
            : 'Lead recruiter can create recruiter accounts only.'}
        </p>
        <form action={APP_ROUTES.internal.team.createUser} className="team-mgmt-form" method="post">
          <div className="team-mgmt-form-grid">
            <label className="team-mgmt-field">
              <span>Full Name</span>
              <input className="input" name="fullName" placeholder="Akhil Verma" required type="text" />
            </label>
            <label className="team-mgmt-field">
              <span>Email</span>
              <input className="input" name="email" placeholder="akhil@inspirix.com" required type="email" />
            </label>
            <label className="team-mgmt-field">
              <span>Temporary Password</span>
              <input className="input" minLength={8} name="password" required type="password" />
            </label>
            {currentUser.role === 'admin' ? (
              <label className="team-mgmt-field">
                <span>Role</span>
                <select className="input" defaultValue="recruiter" name="role">
                  <option value="recruiter">Recruiter</option>
                  <option value="leadRecruiter">Lead Recruiter</option>
                </select>
              </label>
            ) : (
              <input name="role" type="hidden" value="recruiter" />
            )}
            <label className="team-mgmt-field">
              <span>Date of Joining</span>
              <input className="input" defaultValue={todayISO()} name="dateOfJoining" required type="date" />
            </label>
            <label className="team-mgmt-field">
              <span>Designation</span>
              <input
                className="input"
                name="designation"
                placeholder="Talent Acquisition Specialist"
                required
                type="text"
              />
            </label>
            <label className="team-mgmt-field">
              <span>Department</span>
              <input className="input" defaultValue="Recruitment" name="department" required type="text" />
            </label>
            <label className="team-mgmt-field">
              <span>Work Location</span>
              <input className="input" name="workLocation" placeholder="Hyderabad" required type="text" />
            </label>
            <label className="team-mgmt-field">
              <span>Work State</span>
              <input className="input" defaultValue="Telangana" name="workState" required type="text" />
            </label>
            <label className="team-mgmt-field">
              <span>Attendance Shift</span>
              <select className="input" name="attendanceShiftId">
                <option value="">Not assigned</option>
                {shiftsResult.docs.map((shift) => (
                  <option key={`shift-${shift.id}`} value={shift.id}>
                    {shift.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="team-mgmt-field">
              <span>Holiday Calendar</span>
              <select className="input" name="holidayCalendarId">
                <option value="">Not assigned</option>
                {holidaysResult.docs.map((calendar) => (
                  <option key={`holiday-${calendar.id}`} value={calendar.id}>
                    {calendar.name} · {calendar.state || 'All'}
                  </option>
                ))}
              </select>
            </label>
            {currentUser.role === 'admin' ? (
              <label className="team-mgmt-field">
                <span>Reporting Manager</span>
                <select className="input" name="reportingManagerId">
                  <option value="">No manager</option>
                  {managerCandidates.map((member) => (
                    <option key={`manager-${member.id}`} value={member.id}>
                      {readLabel(member)} · {INTERNAL_ROLE_LABELS[member.role]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="team-mgmt-checkbox-grid">
            <label className="team-mgmt-checkbox">
              <input defaultChecked name="isPayrollEligible" type="checkbox" />
              <span>Payroll Eligible</span>
            </label>
            {currentUser.role === 'admin' ? (
              <label className="team-mgmt-checkbox">
                <input name="activateNow" type="checkbox" />
                <span>Activate Account Immediately</span>
              </label>
            ) : null}
          </div>
          <div className="team-mgmt-form-actions">
            <button className="button" type="submit">
              Create Member
            </button>
          </div>
        </form>
      </article>

      <article className="panel team-mgmt-panel">
        <h2>Activation Flow</h2>
        <p className="panel-subtitle">Follow this sequence so a new employee is fully operational.</p>
        <div className="workflow-steps team-mgmt-checklist">
          <div className="workflow-step">
            <span className="workflow-step-number">1</span>
            <div>
              <p className="workflow-step-title">Create Login + Profile</p>
              <p className="workflow-step-desc">Add user account, role, DOJ, location, and shift details.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">2</span>
            <div>
              <p className="workflow-step-title">Activate Account</p>
              <p className="workflow-step-desc">Admin activates user from Team Directory once profile is verified.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">3</span>
            <div>
              <p className="workflow-step-title">Configure Compensation</p>
              <p className="workflow-step-desc">Admin sets salary structure; new record becomes active automatically.</p>
            </div>
          </div>
          <div className="workflow-step">
            <span className="workflow-step-number">4</span>
            <div>
              <p className="workflow-step-title">Payroll Ready</p>
              <p className="workflow-step-desc">Once payout-ready is true, employee is eligible in payroll runs.</p>
            </div>
          </div>
        </div>
      </article>

      {currentUser.role === 'admin' ? (
        <article className="panel panel-span-2 team-mgmt-panel">
          <h2>Set / Update Compensation</h2>
          <p className="panel-subtitle">
            Configure salary components here. Saving replaces any existing active compensation profile.
          </p>
          <form action={APP_ROUTES.internal.team.createCompensation} className="team-mgmt-form" method="post">
            <div className="team-mgmt-form-grid">
              <label className="team-mgmt-field">
                <span>Employee</span>
                <select className="input" name="employeeId" required>
                  <option value="">Select employee</option>
                  {visibleProfiles.map((profile) => (
                    <option key={`comp-employee-${profile.id}`} value={profile.id}>
                      {profile.employeeCode} · {readLabel(profile.user)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="team-mgmt-field">
                <span>Effective From</span>
                <input className="input" defaultValue={todayISO()} name="effectiveFrom" required type="date" />
              </label>
              <label className="team-mgmt-field">
                <span>Annual CTC</span>
                <input className="input" min={0} name="annualCTC" required step="0.01" type="number" />
              </label>
              <label className="team-mgmt-field">
                <span>Monthly Gross</span>
                <input className="input" min={0} name="monthlyGross" required step="0.01" type="number" />
              </label>
              <label className="team-mgmt-field">
                <span>Basic</span>
                <input className="input" min={0} name="basicMonthly" required step="0.01" type="number" />
              </label>
              <label className="team-mgmt-field">
                <span>HRA</span>
                <input className="input" min={0} name="hraMonthly" step="0.01" type="number" />
              </label>
              <label className="team-mgmt-field">
                <span>Special Allowance</span>
                <input className="input" min={0} name="specialAllowanceMonthly" step="0.01" type="number" />
              </label>
              <label className="team-mgmt-field">
                <span>Other Allowance</span>
                <input className="input" min={0} name="otherAllowanceMonthly" step="0.01" type="number" />
              </label>
              <label className="team-mgmt-field">
                <span>Variable</span>
                <input className="input" min={0} name="variableMonthly" step="0.01" type="number" />
              </label>
              <label className="team-mgmt-field">
                <span>Reimbursement</span>
                <input className="input" min={0} name="reimbursementMonthly" step="0.01" type="number" />
              </label>
              <label className="team-mgmt-field">
                <span>Tax Regime</span>
                <select className="input" defaultValue="new" name="taxRegime">
                  <option value="new">New Regime</option>
                  <option value="old">Old Regime</option>
                </select>
              </label>
            </div>
            <div className="team-mgmt-checkbox-grid">
              <label className="team-mgmt-checkbox">
                <input defaultChecked name="pfEnabled" type="checkbox" />
                <span>PF Enabled</span>
              </label>
              <label className="team-mgmt-checkbox">
                <input name="esiEnabled" type="checkbox" />
                <span>ESI Enabled</span>
              </label>
              <label className="team-mgmt-checkbox">
                <input defaultChecked name="professionalTaxEnabled" type="checkbox" />
                <span>Professional Tax Enabled</span>
              </label>
              <label className="team-mgmt-checkbox">
                <input name="lwfEnabled" type="checkbox" />
                <span>LWF Enabled</span>
              </label>
              <label className="team-mgmt-checkbox">
                <input defaultChecked name="tdsEnabled" type="checkbox" />
                <span>TDS Enabled</span>
              </label>
            </div>
            <div className="team-mgmt-form-actions">
              <button className="button" type="submit">
                Save Compensation
              </button>
            </div>
          </form>
        </article>
      ) : null}

      <article className="panel panel-span-2 team-mgmt-panel">
        <div className="team-mgmt-directory-head">
          <h2>Team Directory</h2>
          <p>{totalMembersCount} records</p>
        </div>
        {usersResult.docs.length === 0 ? (
          <p className="panel-subtitle">No team members found.</p>
        ) : (
          <div className="table-wrap team-mgmt-table-wrap">
            <table className="data-table team-mgmt-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Account</th>
                  <th>Employee Profile</th>
                  <th>Reporting Manager</th>
                  <th>Compensation</th>
                  <th>Payout Ready</th>
                  {currentUser.role === 'admin' ? <th>Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {usersResult.docs.map((member) => {
                  const profile = profileByUserID.get(member.id)
                  const compensation = profile ? compensationByEmployeeID.get(profile.id) : undefined
                  const memberName = readLabel(member)
                  const memberInitials = memberName
                    .split(' ')
                    .map((part) => part[0] || '')
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                  const canToggle = member.role !== 'admin'

                  return (
                    <tr key={`team-row-${member.id}`}>
                      <td>
                        <div className="team-mgmt-usercell">
                          <span className="team-mgmt-user-avatar">{memberInitials}</span>
                          <div>
                            <p className="team-mgmt-user-name">{memberName}</p>
                            <p className="team-mgmt-user-email">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="team-mgmt-pill team-mgmt-pill-role">{INTERNAL_ROLE_LABELS[member.role]}</span>
                      </td>
                      <td>
                        <span
                          className={`team-mgmt-pill ${
                            member.isActive ? 'team-mgmt-pill-active' : 'team-mgmt-pill-warning'
                          }`}
                        >
                          {member.isActive ? 'Active' : 'Pending Activation'}
                        </span>
                      </td>
                      <td>
                        {profile ? (
                          <div className="team-mgmt-stack">
                            <p>{profile.employeeCode}</p>
                            <small>{profile.designation}</small>
                          </div>
                        ) : (
                          <span className="team-mgmt-pill team-mgmt-pill-danger">Missing</span>
                        )}
                      </td>
                      <td>{profile ? readLabel(profile.reportingManager, 'Not assigned') : '—'}</td>
                      <td>
                        {currentUser.role === 'admin'
                          ? compensation
                            ? formatMoney(compensation.monthlyGross)
                            : 'Not set'
                          : 'Admin only'}
                      </td>
                      <td>
                        {profile ? (
                          <span
                            className={`team-mgmt-pill ${
                              profile.payoutReady ? 'team-mgmt-pill-active' : 'team-mgmt-pill-muted'
                            }`}
                          >
                            {profile.payoutReady ? 'Ready' : 'Not Ready'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {currentUser.role === 'admin' ? (
                        <td>
                          {canToggle ? (
                            <form action={APP_ROUTES.internal.team.toggleActive} method="post">
                              <input name="userId" type="hidden" value={member.id} />
                              <input name="activate" type="hidden" value={member.isActive ? '0' : '1'} />
                              <button
                                className={`button ${
                                  member.isActive ? 'button-secondary' : ''
                                } team-mgmt-toggle-button`}
                                type="submit"
                              >
                                {member.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </form>
                          ) : (
                            '—'
                          )}
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
