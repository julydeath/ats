import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { HRLeaveDonutChart, HRPayrollBarChart, HRTrendChart } from '@/components/internal/charts/ATSCharts'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLES, INTERNAL_ROLE_LABELS, type InternalRole } from '@/lib/constants/roles'
import { getHRAnalyticsSummary, normalizeHRAnalyticsFilters } from '@/lib/hr/analytics'

type HRAnalyticsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const readQueryParam = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  if (typeof value === 'string') {
    return value
  }

  return null
}

const toDateInputValue = (value: string): string => value.slice(0, 10)

const formatAmount = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value || 0)

export default async function InternalHRAnalyticsPage({ searchParams }: HRAnalyticsPageProps) {
  const user = await requireInternalRole(['admin'])
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = (await searchParams) || {}

  const filters = normalizeHRAnalyticsFilters({
    employeeId: readQueryParam(resolvedSearchParams.employeeId),
    from: readQueryParam(resolvedSearchParams.from),
    role: readQueryParam(resolvedSearchParams.role),
    state: readQueryParam(resolvedSearchParams.state),
    to: readQueryParam(resolvedSearchParams.to),
  })

  const summary = await getHRAnalyticsSummary({
    filters,
    payload,
    user,
  })

  const roleFilterOptions: Array<{ label: string; value: InternalRole | 'all' }> = [
    { label: 'All Roles', value: 'all' },
    ...INTERNAL_ROLES.map((role) => ({
      label: INTERNAL_ROLE_LABELS[role],
      value: role,
    })),
  ]

  const availableStates = Array.from(new Set(summary.employeeSelectors.map((item) => item.state))).sort((a, b) =>
    a.localeCompare(b),
  )

  const filteredEmployeeSelectors = summary.employeeSelectors.filter((item) => {
    if (filters.role !== 'all' && item.role !== filters.role) return false
    if (filters.state && item.state !== filters.state) return false
    return true
  })

  const trendPoints = summary.trend
  const trendChartData = trendPoints.map((point) => ({
    attendance: point.present + point.halfDay + point.leave,
    dayLabel: point.label,
    workflow: point.applications + point.interviews + point.placements,
  }))
  const leaveChartData = summary.leaveBreakdown.map((item) => ({
    days: item.days,
    label: item.label,
  }))
  const payrollChartData = summary.payrollTrend.map((point) => ({
    label: point.label,
    net: point.net,
  }))

  return (
    <section className="hr-analytics-page">
      <header className="hr-analytics-header">
        <div>
          <p className="hr-analytics-kicker">HR Intelligence</p>
          <h1>Attendance, Performance, Leave, and Payroll</h1>
          <p>Admin control center with role-wise and employee-wise operational insights.</p>
        </div>
        <div className="hr-analytics-header-actions">
          <Link className="button button-secondary" href={APP_ROUTES.internal.dashboard}>
            Back to Dashboard
          </Link>
        </div>
      </header>

      <form className="hr-analytics-filters" method="get">
        <label>
          From
          <input className="input" defaultValue={toDateInputValue(filters.fromISO)} name="from" type="date" />
        </label>
        <label>
          To
          <input className="input" defaultValue={toDateInputValue(filters.toISO)} name="to" type="date" />
        </label>
        <label>
          Role
          <select className="input" defaultValue={filters.role} name="role">
            {roleFilterOptions.map((option) => (
              <option key={`analytics-role-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          State
          <select className="input" defaultValue={filters.state || ''} name="state">
            <option value="">All States</option>
            {availableStates.map((state) => (
              <option key={`analytics-state-${state}`} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
        <label>
          Employee
          <select className="input" defaultValue={filters.employeeId || ''} name="employeeId">
            <option value="">All Employees</option>
            {filteredEmployeeSelectors.map((selector) => (
              <option key={`analytics-employee-${selector.id}`} value={selector.id}>
                {selector.label}
              </option>
            ))}
          </select>
        </label>
        <div className="hr-analytics-filter-actions">
          <button className="button" type="submit">
            Apply Filters
          </button>
          <Link className="button button-secondary" href={APP_ROUTES.internal.hr.analytics}>
            Reset
          </Link>
        </div>
      </form>

      <section className="hr-analytics-kpi-grid">
        <article className="hr-analytics-kpi-card">
          <p>Workforce</p>
          <strong>{summary.kpis.workforce}</strong>
          <span>Employees in current filter</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>Attendance Compliance</p>
          <strong>{summary.kpis.attendanceCompliancePct}%</strong>
          <span>Average attendance score</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>Average Performance</p>
          <strong>{summary.kpis.avgPerformanceScore}</strong>
          <span>Composite score /100</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>Approved Leave Days</p>
          <strong>{summary.kpis.approvedLeaveDays}</strong>
          <span>In selected date range</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>LOP Days</p>
          <strong>{summary.kpis.lopDays}</strong>
          <span>Payroll impact days</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>Jobs Created</p>
          <strong>{summary.kpis.jobsCreated}</strong>
          <span>By selected team/users</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>Sourced Applications</p>
          <strong>{summary.kpis.sourcedApplications}</strong>
          <span>New recruiter submissions</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>Stage Moves</p>
          <strong>{summary.kpis.stageMoves}</strong>
          <span>Application transitions</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>Interviews Scheduled</p>
          <strong>{summary.kpis.interviewsScheduled}</strong>
          <span>Interview operations count</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>Active Clients</p>
          <strong>{summary.kpis.totalActiveClients}</strong>
          <span>Owned by selected users</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>Payroll Gross</p>
          <strong>{formatAmount(summary.kpis.payrollGross)}</strong>
          <span>Generated in selected range</span>
        </article>
        <article className="hr-analytics-kpi-card">
          <p>Payout Success</p>
          <strong>{summary.kpis.payoutSuccessPct}%</strong>
          <span>Processed / total payouts</span>
        </article>
      </section>

      <section className="hr-analytics-main-grid">
        <article className="hr-analytics-card hr-analytics-card-span-2">
          <div className="hr-analytics-card-head">
            <h2>Attendance vs Workflow Trend</h2>
            <span>{trendPoints.length} day window</span>
          </div>
          {trendPoints.length === 0 ? (
            <p className="hr-analytics-empty">No trend data available for selected filters.</p>
          ) : (
            <HRTrendChart data={trendChartData} />
          )}
        </article>

        <article className="hr-analytics-card">
          <div className="hr-analytics-card-head">
            <h2>Leave Breakdown</h2>
            <span>Approved + pending request mix</span>
          </div>
          {summary.leaveBreakdown.length === 0 ? (
            <p className="hr-analytics-empty">No leave requests available.</p>
          ) : (
            <HRLeaveDonutChart data={leaveChartData} />
          )}
        </article>

        <article className="hr-analytics-card">
          <div className="hr-analytics-card-head">
            <h2>Payroll Trend</h2>
            <span>Net payable by month</span>
          </div>
          {summary.payrollTrend.length === 0 ? (
            <p className="hr-analytics-empty">No payroll runs generated in this period.</p>
          ) : (
            <HRPayrollBarChart data={payrollChartData} />
          )}
        </article>
      </section>

      <article className="hr-analytics-card">
        <div className="hr-analytics-card-head">
          <h2>Employee Performance Table</h2>
          <span>{summary.employeeRows.length} employees</span>
        </div>
        {summary.employeeRows.length === 0 ? (
          <p className="hr-analytics-empty">No employee data for selected filters.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>State</th>
                  <th>Score</th>
                  <th>Attendance</th>
                  <th>Jobs</th>
                  <th>Applications</th>
                  <th>Stage Moves</th>
                  <th>Interviews</th>
                  <th>Placements</th>
                  <th>Leave</th>
                  <th>LOP</th>
                </tr>
              </thead>
              <tbody>
                {summary.employeeRows.map((row) => (
                  <tr key={`analytics-employee-row-${row.employeeId}`}>
                    <td>
                      {row.employeeCode}
                      <br />
                      <span className="muted tiny">{row.name}</span>
                    </td>
                    <td>{INTERNAL_ROLE_LABELS[row.role]}</td>
                    <td>{row.state}</td>
                    <td>{row.score}</td>
                    <td>{row.attendancePct}%</td>
                    <td>{row.jobsCreated}</td>
                    <td>{row.applicationsAdded}</td>
                    <td>{row.stageMoves}</td>
                    <td>{row.interviewsScheduled}</td>
                    <td>{row.placementsClosed}</td>
                    <td>{row.leaveDays}</td>
                    <td>{row.lopDays}</td>
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
