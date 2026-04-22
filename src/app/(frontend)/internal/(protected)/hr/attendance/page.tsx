import configPromise from '@payload-config'
import { getPayload, type Where } from 'payload'

import { SimpleBarChart, SimpleDonutChart } from '@/components/internal/charts/ATSCharts'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { ATTENDANCE_STATUS_LABELS, type AttendanceStatus } from '@/lib/constants/hr'
import {
  buildAttendanceCalendarDays,
  normalizeAttendanceQueryFilters,
} from '@/lib/hr/attendance-query'

type AttendancePageProps = {
  searchParams?: Promise<{
    employeeId?: string
    error?: string
    from?: string
    month?: string
    success?: string
    to?: string
    view?: string
  }>
}

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatDateTime = (value?: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  })
}

const readLabel = (value: unknown, fallback = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as { employeeCode?: string; email?: string; fullName?: string; name?: string }

    return typed.fullName || typed.name || typed.employeeCode || typed.email || fallback
  }

  return fallback
}

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  absent: '#dc2626',
  halfDay: '#d97706',
  holiday: '#2563eb',
  leave: '#7c3aed',
  present: '#059669',
  weekOff: '#475569',
}

const toISODate = (value: Date): string => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toShortEmployeeLabel = (value: string): string => {
  const parts = value.trim().split(/\s+/)
  if (parts.length === 0) return 'Unknown'
  if (parts.length === 1) return parts[0].slice(0, 10)
  return `${parts[0]} ${parts[1].slice(0, 1)}`
}

export default async function InternalHRAttendancePage({ searchParams }: AttendancePageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolved = (await searchParams) || {}

  const selfEmployeeProfileResult = await payload.find({
    collection: 'employee-profiles',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    user,
    where: {
      user: {
        equals: user.id,
      },
    },
  })

  const selfEmployeeProfile = selfEmployeeProfileResult.docs[0] || null
  const selfEmployeeID = selfEmployeeProfile?.id || null

  const filters = normalizeAttendanceQueryFilters({
    input: {
      employeeId: resolved.employeeId || null,
      from: resolved.from || null,
      month: resolved.month || null,
      to: resolved.to || null,
      view: resolved.view || null,
    },
    role: user.role,
    selfEmployeeId: selfEmployeeID,
  })

  const canViewTeam = user.role === 'admin' || user.role === 'leadRecruiter'
  const selectedEmployeeID = filters.employeeId
  const missingProfile = filters.view === 'my' && !selectedEmployeeID

  const employeeOptionsResult = canViewTeam
    ? await payload.find({
        collection: 'employee-profiles',
        depth: 1,
        limit: 300,
        overrideAccess: false,
        pagination: false,
        select: {
          employeeCode: true,
          id: true,
          user: true,
          workLocation: true,
        },
        sort: 'employeeCode',
        user,
        where: {
          employmentStatus: {
            equals: 'active',
          },
        },
      })
    : { docs: [] as any[] }

  const summaryWhere: Where = {
    and: [
      {
        date: {
          greater_than_equal: filters.fromISO,
        },
      },
      {
        date: {
          less_than_equal: filters.toISO,
        },
      },
      ...(selectedEmployeeID
        ? [
            {
              employee: {
                equals: selectedEmployeeID,
              },
            },
          ]
        : []),
    ],
  }

  const logsWhere: Where = {
    and: [
      {
        punchDate: {
          greater_than_equal: filters.fromISO,
        },
      },
      {
        punchDate: {
          less_than_equal: filters.toISO,
        },
      },
      ...(selectedEmployeeID
        ? [
            {
              employee: {
                equals: selectedEmployeeID,
              },
            },
          ]
        : []),
    ],
  }

  const [selectedSummariesResult, selectedLogsResult, teamSummariesResult, openSessionsResult] = await Promise.all([
    missingProfile || !selectedEmployeeID
      ? Promise.resolve({ docs: [] as any[] })
      : payload.find({
          collection: 'attendance-daily-summaries',
          depth: 1,
          limit: 180,
          overrideAccess: false,
          sort: 'date',
          user,
          where: summaryWhere,
        }),
    missingProfile || !selectedEmployeeID
      ? Promise.resolve({ docs: [] as any[] })
      : payload.find({
          collection: 'attendance-logs',
          depth: 1,
          limit: 120,
          overrideAccess: false,
          sort: '-punchInAt',
          user,
          where: logsWhere,
        }),
    canViewTeam && filters.view === 'team'
      ? payload.find({
          collection: 'attendance-daily-summaries',
          depth: 1,
          limit: 2000,
          overrideAccess: false,
          sort: '-date',
          user,
          where: {
            and: [
              {
                date: {
                  greater_than_equal: filters.fromISO,
                },
              },
              {
                date: {
                  less_than_equal: filters.toISO,
                },
              },
              ...(selectedEmployeeID
                ? [
                    {
                      employee: {
                        equals: selectedEmployeeID,
                      },
                    },
                  ]
                : []),
            ],
          },
        })
      : Promise.resolve({ docs: [] as any[] }),
    canViewTeam
      ? payload.find({
          collection: 'attendance-logs',
          depth: 1,
          limit: 60,
          overrideAccess: false,
          sort: '-punchInAt',
          user,
          where: {
            and: [
              {
                punchOutAt: {
                  exists: false,
                },
              },
              ...(selectedEmployeeID && filters.view === 'team'
                ? [
                    {
                      employee: {
                        equals: selectedEmployeeID,
                      },
                    },
                  ]
                : []),
            ],
          },
        })
      : Promise.resolve({ docs: [] as any[] }),
  ])

  const selectedSummaries = selectedSummariesResult.docs
  const selectedLogs = selectedLogsResult.docs
  const teamSummaries = teamSummariesResult.docs
  const openSessions = openSessionsResult.docs

  const openOwnSession = selectedLogs.find((item) => !item.punchOutAt)

  const statusCounts = selectedSummaries.reduce(
    (acc, row) => {
      const status = String(row.status || 'absent') as AttendanceStatus
      if (status in acc.byStatus) {
        acc.byStatus[status] += 1
      }
      acc.total += 1
      if (row.lop) acc.lopDays += 1
      return acc
    },
    {
      byStatus: {
        absent: 0,
        halfDay: 0,
        holiday: 0,
        leave: 0,
        present: 0,
        weekOff: 0,
      } satisfies Record<AttendanceStatus, number>,
      lopDays: 0,
      total: 0,
    },
  )

  const statusByDate = new Map<string, AttendanceStatus>()
  selectedSummaries.forEach((row) => {
    const key = new Date(row.date).toISOString().slice(0, 10)
    statusByDate.set(key, row.status as AttendanceStatus)
  })

  const calendarDays = buildAttendanceCalendarDays({
    month: filters.month,
    statusByDate,
  })

  const teamRows = new Map<string, {
    employeeLabel: string
    halfDay: number
    leave: number
    lop: number
    present: number
    total: number
  }>()

  teamSummaries.forEach((row) => {
    const key = String(typeof row.employee === 'object' ? row.employee.id : row.employee)
    const existing = teamRows.get(key) || {
      employeeLabel: readLabel(row.employee, 'Unknown'),
      halfDay: 0,
      leave: 0,
      lop: 0,
      present: 0,
      total: 0,
    }

    existing.total += 1
    if (row.status === 'present') existing.present += 1
    if (row.status === 'leave') existing.leave += 1
    if (row.status === 'halfDay') existing.halfDay += 1
    if (row.lop) existing.lop += 1
    teamRows.set(key, existing)
  })

  const teamRowsSorted = Array.from(teamRows.values()).sort((a, b) => b.total - a.total).slice(0, 12)
  const attendanceStatusChartData = (Object.entries(statusCounts.byStatus) as Array<[AttendanceStatus, number]>)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      label: ATTENDANCE_STATUS_LABELS[key],
      value,
    }))

  const workedTrendChartData = selectedSummaries
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-14)
    .map((row) => ({
      label: new Date(row.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      }),
      value: Number(row.workedMinutes || 0),
    }))

  const teamPresenceChartData = teamRowsSorted.slice(0, 8).map((row) => ({
    label: toShortEmployeeLabel(row.employeeLabel),
    value: row.present,
  }))

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">HRMS · Attendance</p>
        <h1>{filters.view === 'team' ? 'Team Attendance' : 'My Attendance'}</h1>
        <p className="panel-intro">
          Use monthly calendar status, punch logs, and attendance summaries to track daily compliance and LOP impact.
        </p>
        {resolved.success ? <p className="panel-subtitle">Success: {resolved.success}</p> : null}
        {resolved.error ? <p className="panel-subtitle" style={{ color: '#b91c1c' }}>Error: {resolved.error}</p> : null}
      </article>

      {(user.role === 'leadRecruiter' || user.role === 'recruiter') ? (
        <article className="panel">
          <h2>Punch Controls</h2>
          {missingProfile ? (
            <p className="panel-subtitle" style={{ color: '#b91c1c' }}>
              Employee profile is missing. Ask admin to map your employee profile to enable punch in/out.
            </p>
          ) : (
            <>
              <p className="panel-subtitle">
                {openOwnSession
                  ? `Open session from ${formatDateTime(openOwnSession.punchInAt)}.`
                  : 'No active session. Start your day using punch-in.'}
              </p>
              <div className="public-actions" style={{ marginTop: 12 }}>
                <form action={APP_ROUTES.internal.hr.attendancePunchIn} method="post">
                  <input name="source" type="hidden" value="web" />
                  <button className="button" type="submit">
                    Punch In
                  </button>
                </form>
                <form action={APP_ROUTES.internal.hr.attendancePunchOut} method="post">
                  <button className="button button-secondary" type="submit">
                    Punch Out
                  </button>
                </form>
              </div>
            </>
          )}
        </article>
      ) : (
        <article className="panel">
          <h2>Admin Attendance Control</h2>
          <p className="panel-subtitle">Admins review attendance and approvals; punch in/out is disabled for admin role.</p>
        </article>
      )}

      <article className="panel">
        <h2>Summary</h2>
        <ul>
          <li>Total Days Tracked: {statusCounts.total}</li>
          <li>Present: {statusCounts.byStatus.present}</li>
          <li>Leave: {statusCounts.byStatus.leave}</li>
          <li>Half Day: {statusCounts.byStatus.halfDay}</li>
          <li>LOP Days: {statusCounts.lopDays}</li>
        </ul>
      </article>

      <article className="panel panel-span-2">
        <h2>Visual Insights</h2>
        <div
          style={{
            display: 'grid',
            gap: '0.85rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          <div>
            <p className="panel-subtitle">Attendance Status Mix</p>
            {attendanceStatusChartData.length === 0 ? (
              <p className="panel-subtitle">No summary data for this period.</p>
            ) : (
              <SimpleDonutChart ariaLabel="Attendance status distribution" data={attendanceStatusChartData} />
            )}
          </div>
          <div>
            <p className="panel-subtitle">Worked Minutes Trend</p>
            {workedTrendChartData.length === 0 ? (
              <p className="panel-subtitle">No worked time trend available.</p>
            ) : (
              <SimpleBarChart ariaLabel="Worked minutes trend" data={workedTrendChartData} />
            )}
          </div>
          {canViewTeam && filters.view === 'team' ? (
            <div>
              <p className="panel-subtitle">Top Present Days (Team)</p>
              {teamPresenceChartData.length === 0 ? (
                <p className="panel-subtitle">No team summary available.</p>
              ) : (
                <SimpleBarChart ariaLabel="Team present days" data={teamPresenceChartData} />
              )}
            </div>
          ) : null}
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Attendance Filters</h2>
        <form className="ops-form-shell ops-form-shell-strong" method="get">
          <div className="ops-form-grid ops-form-grid-3">
            {canViewTeam ? (
              <label className="ops-form-field">
                <span>View</span>
                <select defaultValue={filters.view} name="view">
                  <option value="my">My Attendance</option>
                  <option value="team">Team Attendance</option>
                </select>
              </label>
            ) : (
              <input name="view" type="hidden" value="my" />
            )}
            <label className="ops-form-field">
              <span>Month</span>
              <input defaultValue={filters.month} name="month" type="month" />
            </label>
            <label className="ops-form-field">
              <span>From</span>
              <input defaultValue={toISODate(new Date(filters.fromISO))} name="from" type="date" />
            </label>
            <label className="ops-form-field">
              <span>To</span>
              <input defaultValue={toISODate(new Date(filters.toISO))} name="to" type="date" />
            </label>
            {canViewTeam && filters.view === 'team' ? (
              <label className="ops-form-field">
                <span>Employee</span>
                <select defaultValue={filters.employeeId || ''} name="employeeId">
                  <option value="">All Employees</option>
                  {employeeOptionsResult.docs.map((profile) => (
                    <option key={`attendance-employee-${profile.id}`} value={profile.id}>
                      {profile.employeeCode} · {readLabel(profile.user)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="ops-form-actions ops-form-actions-left">
            <button className="button" type="submit">
              Apply Filters
            </button>
            <a className="button button-secondary" href={APP_ROUTES.internal.hr.attendance}>
              Reset
            </a>
          </div>
        </form>
      </article>

      <article className="panel panel-span-2">
        <h2>Monthly Calendar</h2>
        {missingProfile ? (
          <p className="panel-subtitle">No calendar available until employee profile is mapped.</p>
        ) : selectedEmployeeID ? (
          <div className="table-wrap">
            <div
              style={{
                display: 'grid',
                gap: 8,
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              }}
            >
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} style={{ color: '#475569', fontSize: 12, fontWeight: 700, padding: '2px 4px' }}>
                  {day}
                </div>
              ))}

              {calendarDays.map((day) => (
                <article
                  key={day.dateISO}
                  style={{
                    background: day.inCurrentMonth ? '#fff' : '#f8fafc',
                    border: day.isToday ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    borderRadius: 12,
                    minHeight: 74,
                    padding: 8,
                  }}
                >
                  <p style={{ fontWeight: 700, margin: 0 }}>{day.day}</p>
                  {day.status ? (
                    <p
                      style={{
                        color: STATUS_COLOR[day.status],
                        fontSize: 12,
                        fontWeight: 700,
                        margin: '6px 0 0',
                      }}
                    >
                      {ATTENDANCE_STATUS_LABELS[day.status]}
                    </p>
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: 12, margin: '6px 0 0' }}>—</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="panel-subtitle">Select an employee in Team Attendance view to render calendar statuses.</p>
        )}
      </article>

      {canViewTeam ? (
        <article className="panel">
          <h2>Currently Punched In</h2>
          {openSessions.length === 0 ? (
            <p className="panel-subtitle">No open sessions right now.</p>
          ) : (
            <ul>
              {openSessions.slice(0, 10).map((row) => (
                <li key={`open-attendance-${row.id}`}>
                  {readLabel(row.employee)} · {formatDateTime(row.punchInAt)}
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}

      {canViewTeam && filters.view === 'team' ? (
        <article className="panel panel-span-2">
          <h2>Team Attendance Snapshot</h2>
          {teamRowsSorted.length === 0 ? (
            <p className="panel-subtitle">No attendance summaries in selected period.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Tracked Days</th>
                    <th>Present</th>
                    <th>Leave</th>
                    <th>Half Day</th>
                    <th>LOP</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRowsSorted.map((row) => (
                    <tr key={`team-attendance-${row.employeeLabel}`}>
                      <td>{row.employeeLabel}</td>
                      <td>{row.total}</td>
                      <td>{row.present}</td>
                      <td>{row.leave}</td>
                      <td>{row.halfDay}</td>
                      <td>{row.lop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ) : null}

      <article className="panel panel-span-2">
        <h2>Recent Punch Logs</h2>
        {selectedLogs.length === 0 ? (
          <p className="panel-subtitle">No attendance logs available for current filters.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Worked (mins)</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {selectedLogs.slice(0, 50).map((row) => (
                  <tr key={`attendance-log-${row.id}`}>
                    <td>{readLabel(row.employee)}</td>
                    <td>{formatDateTime(row.punchInAt)}</td>
                    <td>{formatDateTime(row.punchOutAt)}</td>
                    <td>{row.workedMinutes || 0}</td>
                    <td>{String(row.source || 'web')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Attendance Summaries</h2>
        {selectedSummaries.length === 0 ? (
          <p className="panel-subtitle">No summary records found for selected employee/date range.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Worked</th>
                  <th>Late</th>
                  <th>Overtime</th>
                  <th>LOP</th>
                </tr>
              </thead>
              <tbody>
                {selectedSummaries.slice().reverse().map((row) => (
                  <tr key={`attendance-summary-${row.id}`}>
                    <td>{formatDate(row.date)}</td>
                    <td>{readLabel(row.employee)}</td>
                    <td>{ATTENDANCE_STATUS_LABELS[row.status as AttendanceStatus] || String(row.status)}</td>
                    <td>{row.workedMinutes || 0}</td>
                    <td>{row.lateMinutes || 0}</td>
                    <td>{row.overtimeMinutes || 0}</td>
                    <td>{row.lop ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
