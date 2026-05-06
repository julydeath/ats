import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { HRPayrollBarChart, SimpleDonutChart } from '@/components/internal/charts/ATSCharts'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import {
  PAYROLL_PAYMENT_MODE_LABELS,
  PAYROLL_PAYMENT_STATUS_LABELS,
  PAYROLL_RUN_STATUS_LABELS,
  PAYROLL_CYCLE_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  type PayrollPaymentStatus,
  type PayrollRunStatus,
  type PayrollCycleStatus,
  type PayoutStatus,
} from '@/lib/constants/hr'
import { isDateInGraphRange, resolveGraphDateRange, toDateInputValue } from '@/lib/hr/graph-filters'
import { isRazorpayXConfigured } from '@/lib/payments/razorpayx'

const formatDate = (value?: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatAmount = (value?: number | null): string =>
  new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(value || 0)

const formatDateTime = (value?: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : ''

const maskAccountNumber = (value: unknown): string => {
  const digits = asString(value).replace(/\s+/g, '')
  if (!digits) return '—'
  if (digits.length <= 4) return digits
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
}

const normalizePaymentStatus = (value: unknown): PayrollPaymentStatus => {
  if (value === 'paid' || value === 'notPaid') return value
  return 'pending'
}

const payrollPaymentPillClassName = (status: PayrollPaymentStatus): string =>
  `status-pill payroll-payment-pill payroll-payment-pill-${status}`

const getEmployeeUser = (lineItem: Record<string, unknown>): Record<string, unknown> | null => {
  const employee = asRecord(lineItem.employee)
  return asRecord(employee?.user)
}

const getEmployeeName = (lineItem: Record<string, unknown>): string => {
  const user = getEmployeeUser(lineItem)
  return (
    asString(user?.fullName) ||
    asString(user?.email) ||
    asString(asRecord(lineItem.employee)?.employeeCode) ||
    'Employee'
  )
}

const getEmployeeEmail = (lineItem: Record<string, unknown>): string =>
  asString(getEmployeeUser(lineItem)?.email) || '—'

const getEmployeeCode = (lineItem: Record<string, unknown>): string =>
  asString(asRecord(lineItem.employee)?.employeeCode) || '—'

const getEmployeeDesignation = (lineItem: Record<string, unknown>): string =>
  asString(asRecord(lineItem.employee)?.designation) || '—'

const getEmployeeBankLine = (lineItem: Record<string, unknown>): string => {
  const employee = asRecord(lineItem.employee)
  const bankName = asString(employee?.bankName)
  const bankIFSC = asString(employee?.bankIFSC)
  const account = maskAccountNumber(employee?.bankAccountNumber)

  return [bankName, account !== '—' ? account : '', bankIFSC].filter(Boolean).join(' · ') || '—'
}

const getRunRecord = (lineItem: Record<string, unknown>): Record<string, unknown> | null =>
  asRecord(lineItem.payrollRun)

const getRunCode = (lineItem: Record<string, unknown>): string =>
  asString(getRunRecord(lineItem)?.payrollRunCode) || '—'

const getCycleLabel = (lineItem: Record<string, unknown>): string => {
  const cycle = asRecord(getRunRecord(lineItem)?.payrollCycle)
  const month = cycle?.month
  const year = cycle?.year
  if (typeof month === 'number' && typeof year === 'number') {
    return `${String(month).padStart(2, '0')}/${year}`
  }

  return '—'
}

type PayrollPageProps = {
  searchParams?: Promise<{ error?: string; from?: string; month?: string; period?: string; success?: string; to?: string }>
}

export default async function InternalHRPayrollPage({ searchParams }: PayrollPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const razorpayReady = isRazorpayXConfigured()
  const resolved = (await searchParams) || {}
  const range = resolveGraphDateRange({
    from: resolved.from || null,
    month: resolved.month || null,
    period: resolved.period || null,
    to: resolved.to || null,
  })

  if (user.role !== 'admin') {
    return (
      <section className="dashboard-grid">
        <article className="panel panel-span-2">
          <p className="eyebrow">HRMS · Payroll</p>
          <h1>Payroll Access Restricted</h1>
          <p className="panel-intro">
            Payroll and salary details are visible to admins only. You can continue using attendance,
            leave, and performance modules.
          </p>
        </article>
      </section>
    )
  }

  const [cycles, runs, ruleSets, lineItems, payouts] = await Promise.all([
    payload.find({
      collection: 'payroll-cycles',
      depth: 0,
      limit: 24,
      overrideAccess: false,
      sort: '-year',
      user,
    }),
    payload.find({
      collection: 'payroll-runs',
      depth: 2,
      limit: 200,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'payroll-rule-sets',
      depth: 0,
      limit: 20,
      overrideAccess: false,
      sort: '-effectiveFrom',
      user,
      where: {
        isActive: {
          equals: true,
        },
      },
    }),
    payload.find({
      collection: 'payroll-line-items',
      depth: 2,
      limit: 500,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'payroll-payout-transactions',
      depth: 1,
      limit: 200,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
  ])

  const filteredCycles = cycles.docs.filter((cycle) =>
    isDateInGraphRange({
      dateValue: cycle.startDate,
      range,
    }),
  )

  const filteredRuns = runs.docs.filter((run) =>
    isDateInGraphRange({
      dateValue: typeof run.payrollCycle === 'object' ? run.payrollCycle.startDate : run.createdAt,
      range,
    }),
  )

  const filteredLineItems = lineItems.docs.filter((lineItem) =>
    isDateInGraphRange({
      dateValue:
        typeof lineItem.payrollRun === 'object' &&
        lineItem.payrollRun &&
        typeof lineItem.payrollRun.payrollCycle === 'object' &&
        lineItem.payrollRun.payrollCycle
          ? lineItem.payrollRun.payrollCycle.startDate
          : lineItem.updatedAt,
      range,
    }),
  )

  const filteredPayouts = payouts.docs.filter((payout) =>
    isDateInGraphRange({
      dateValue: payout.updatedAt,
      range,
    }),
  )

  const payrollTrendChartData = filteredRuns
    .slice()
    .sort((a, b) => {
      const aDate =
        typeof a.payrollCycle === 'object' ? new Date(a.payrollCycle.startDate).getTime() : new Date(a.createdAt).getTime()
      const bDate =
        typeof b.payrollCycle === 'object' ? new Date(b.payrollCycle.startDate).getTime() : new Date(b.createdAt).getTime()
      return aDate - bDate
    })
    .slice(-6)
    .map((run) => ({
      label:
        typeof run.payrollCycle === 'object'
          ? `${String(run.payrollCycle.month).padStart(2, '0')}/${String(run.payrollCycle.year).slice(-2)}`
          : String(run.payrollRunCode).slice(-6),
      net: Number(run.totalNet || 0),
    }))

  const runStatusCounts = filteredRuns.reduce<Record<string, number>>((acc, run) => {
    const key = String(run.status || 'draft')
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const runStatusChartData = Object.entries(runStatusCounts).map(([status, value]) => ({
    label: PAYROLL_RUN_STATUS_LABELS[status as PayrollRunStatus] || status,
    value,
  }))

  const payoutStatusCounts = filteredPayouts.reduce<Record<string, number>>((acc, payout) => {
    const key = String(payout.payoutStatus || 'queued')
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const payoutStatusChartData = Object.entries(payoutStatusCounts).map(([status, value]) => ({
    label: PAYOUT_STATUS_LABELS[status as PayoutStatus] || status,
    value,
  }))

  const manualPaymentSummary = filteredLineItems.reduce(
    (acc, item) => {
      const status = normalizePaymentStatus((item as unknown as Record<string, unknown>).paymentStatus)
      const net = Number(item.netPayable || 0)

      acc.totalAmount += net
      acc.totalEmployees += 1

      if (status === 'paid') {
        acc.paidAmount += net
        acc.paidCount += 1
      } else if (status === 'notPaid') {
        acc.notPaidAmount += net
        acc.notPaidCount += 1
      } else {
        acc.pendingAmount += net
        acc.pendingCount += 1
      }

      return acc
    },
    {
      notPaidAmount: 0,
      notPaidCount: 0,
      paidAmount: 0,
      paidCount: 0,
      pendingAmount: 0,
      pendingCount: 0,
      totalAmount: 0,
      totalEmployees: 0,
    },
  )

  const runSettlementSummary = filteredLineItems.reduce<
    Record<
      string,
      {
        paidAmount: number
        paidCount: number
        pendingAmount: number
        pendingCount: number
        totalCount: number
      }
    >
  >((acc, item) => {
    const runKey =
      typeof item.payrollRun === 'object' && item.payrollRun ? String(item.payrollRun.id) : String(item.payrollRun)

    if (!acc[runKey]) {
      acc[runKey] = {
        paidAmount: 0,
        paidCount: 0,
        pendingAmount: 0,
        pendingCount: 0,
        totalCount: 0,
      }
    }

    const status = normalizePaymentStatus((item as unknown as Record<string, unknown>).paymentStatus)
    const net = Number(item.netPayable || 0)

    acc[runKey].totalCount += 1

    if (status === 'paid') {
      acc[runKey].paidCount += 1
      acc[runKey].paidAmount += net
    } else {
      acc[runKey].pendingCount += 1
      acc[runKey].pendingAmount += net
    }

    return acc
  }, {})

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">HRMS · Payroll</p>
        <h1>India Payroll Engine</h1>
        <p className="panel-intro">
          Manual monthly salary processing with employee-wise pay register, payout tracking, and future RazorpayX support.
        </p>
        <p className="panel-subtitle">
          Showing data from {formatDate(range.fromISO)} to {formatDate(range.toISO)}.
        </p>
        {resolved.success ? <p className="panel-subtitle">Success: {resolved.success}</p> : null}
        {resolved.error ? <p className="panel-subtitle" style={{ color: '#b91c1c' }}>Error: {resolved.error}</p> : null}
      </article>

      <article className="panel">
        <h2>What This Page Does</h2>
        <ul>
          <li>Creates payroll cycle for month and payout date.</li>
          <li>Generates run from attendance + compensation data.</li>
          <li>Tracks manual payment status employee by employee with full salary history.</li>
        </ul>
      </article>

      <article className="panel">
        <h2>Operational Sequence</h2>
        <ol>
          <li>Create cycle</li>
          <li>Generate run</li>
          <li>Lock run</li>
          <li>Approve run</li>
          <li>Transfer salary manually outside the app</li>
          <li>Mark each employee as paid, pending, or not paid</li>
        </ol>
        <p className="panel-subtitle">
          RazorpayX remains available for future automation. Manual settlement is the primary workflow right now.
        </p>
      </article>

      <article className="panel panel-span-2">
        <h2>How Payroll Amount Is Calculated</h2>
        <div className="ops-detail-grid">
          <div className="ops-detail-card">
            <p className="ops-detail-label">Step 1 · Salary Basis</p>
            <p className="ops-detail-value">Effective employee compensation for the selected payroll cycle</p>
            <p className="ops-detail-meta">
              Basic + HRA + special allowance + variable + other allowance + reimbursements + custom earnings.
            </p>
          </div>
          <div className="ops-detail-card">
            <p className="ops-detail-label">Step 2 · Attendance Impact</p>
            <p className="ops-detail-value">LOP is calculated from attendance daily summaries</p>
            <p className="ops-detail-meta">
              Any day marked as loss of pay reduces salary proportionally for that cycle.
            </p>
          </div>
          <div className="ops-detail-card">
            <p className="ops-detail-label">Step 3 · Statutory Deductions</p>
            <p className="ops-detail-value">PF, ESI, Professional Tax, LWF, TDS</p>
            <p className="ops-detail-meta">
              Rates and caps come from the payroll rule set for the employee work state and effective date.
            </p>
          </div>
          <div className="ops-detail-card">
            <p className="ops-detail-label">Step 4 · Final Net Pay</p>
            <p className="ops-detail-value">Gross earnings minus deductions</p>
            <p className="ops-detail-meta">
              A payroll line item is created per employee. That line item becomes the run snapshot used for payslip and payout.
            </p>
          </div>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Graph Filters</h2>
        <form className="ops-form-shell ops-form-shell-strong" method="get">
          <div className="ops-form-grid ops-form-grid-5">
            <label className="ops-form-field">
              <span>Period</span>
              <select defaultValue={range.period} name="period">
                <option value="day">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Selected Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </label>
            <label className="ops-form-field">
              <span>Month</span>
              <input defaultValue={range.month} name="month" type="month" />
            </label>
            <label className="ops-form-field">
              <span>From</span>
              <input defaultValue={toDateInputValue(range.from)} name="from" type="date" />
            </label>
            <label className="ops-form-field">
              <span>To</span>
              <input defaultValue={toDateInputValue(range.to)} name="to" type="date" />
            </label>
          </div>
          <div className="ops-form-actions ops-form-actions-left">
            <button className="button" type="submit">
              Apply Graph Filter
            </button>
            <a className="button button-secondary" href={APP_ROUTES.internal.hr.payroll}>
              Reset
            </a>
          </div>
        </form>
      </article>

      <article className="panel panel-span-2">
        <h2>Payroll Visual Insights</h2>
        <div
          style={{
            display: 'grid',
            gap: '0.85rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          <div>
            <p className="panel-subtitle">Net Pay Trend</p>
            <p className="graph-caption">Monthly net payable generated from filtered payroll runs.</p>
            {payrollTrendChartData.length === 0 ? (
              <p className="panel-subtitle">No run totals available yet.</p>
            ) : (
              <HRPayrollBarChart data={payrollTrendChartData} />
            )}
          </div>
          <div>
            <p className="panel-subtitle">Run Status Distribution</p>
            <p className="graph-caption">How many runs are in draft, approved, partially paid, completed, or payout stages.</p>
            {runStatusChartData.length === 0 ? (
              <p className="panel-subtitle">No payroll runs available.</p>
            ) : (
              <SimpleDonutChart ariaLabel="Payroll run status distribution" data={runStatusChartData} />
            )}
          </div>
          <div>
            <p className="panel-subtitle">Payout Status Distribution</p>
            <p className="graph-caption">Optional RazorpayX payout transaction mix for success, processing, and failed attempts.</p>
            {payoutStatusChartData.length === 0 ? (
              <p className="panel-subtitle">No payout transactions available.</p>
            ) : (
              <SimpleDonutChart ariaLabel="Payout status distribution" data={payoutStatusChartData} />
            )}
          </div>
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>Manual Salary Settlement Summary</h2>
        <div className="ops-detail-grid">
          <div className="ops-detail-card">
            <p className="ops-detail-label">Employees In View</p>
            <p className="ops-detail-value">{manualPaymentSummary.totalEmployees}</p>
            <p className="ops-detail-meta">Employee salary rows in the filtered payroll history.</p>
          </div>
          <div className="ops-detail-card">
            <p className="ops-detail-label">Total Net Amount</p>
            <p className="ops-detail-value">{formatAmount(manualPaymentSummary.totalAmount)}</p>
            <p className="ops-detail-meta">Total net payable across all visible payroll rows.</p>
          </div>
          <div className="ops-detail-card">
            <p className="ops-detail-label">Paid</p>
            <p className="ops-detail-value">
              {manualPaymentSummary.paidCount} · {formatAmount(manualPaymentSummary.paidAmount)}
            </p>
            <p className="ops-detail-meta">Rows already settled manually.</p>
          </div>
          <div className="ops-detail-card">
            <p className="ops-detail-label">Pending / Not Paid</p>
            <p className="ops-detail-value">
              {manualPaymentSummary.pendingCount + manualPaymentSummary.notPaidCount} ·{' '}
              {formatAmount(manualPaymentSummary.pendingAmount + manualPaymentSummary.notPaidAmount)}
            </p>
            <p className="ops-detail-meta">Outstanding salary rows still requiring manual action.</p>
          </div>
        </div>
      </article>

      <article className="panel">
        <h2>Create Payroll Cycle</h2>
        <form action={APP_ROUTES.internal.hr.payrollGenerate} className="ops-form-shell ops-form-shell-strong" method="post">
          <input name="actionType" type="hidden" value="createCycle" />
          <div className="ops-form-grid ops-form-grid-3">
            <label className="ops-form-field">
              <span>Month</span>
              <input max={12} min={1} name="month" required type="number" />
            </label>
            <label className="ops-form-field">
              <span>Year</span>
              <input max={2200} min={2000} name="year" required type="number" />
            </label>
            <label className="ops-form-field">
              <span>Start Date</span>
              <input name="startDate" required type="date" />
            </label>
            <label className="ops-form-field">
              <span>End Date</span>
              <input name="endDate" required type="date" />
            </label>
            <label className="ops-form-field">
              <span>Payout Date</span>
              <input name="payoutDate" type="date" />
            </label>
          </div>
          <div className="ops-form-actions">
            <button className="button" type="submit">
              Create Payroll Cycle
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <h2>Generate Payroll Run</h2>
        <form action={APP_ROUTES.internal.hr.payrollGenerate} className="ops-form-shell ops-form-shell-strong" method="post">
          <input name="actionType" type="hidden" value="generateRun" />
          <div className="ops-form-grid ops-form-grid-2">
            <label className="ops-form-field">
              <span>Payroll Cycle</span>
              <select name="cycleId" required>
                <option value="">Select cycle</option>
                {cycles.docs.map((cycle) => (
                  <option key={`cycle-${cycle.id}`} value={cycle.id}>
                    {cycle.payrollCycleCode} · {cycle.month}/{cycle.year}
                  </option>
                ))}
              </select>
            </label>
            <label className="ops-form-field">
              <span>Rule Set (Optional)</span>
              <select name="ruleSetId">
                <option value="">Auto by employee state</option>
                {ruleSets.docs.map((ruleSet) => (
                  <option key={`rule-${ruleSet.id}`} value={ruleSet.id}>
                    {ruleSet.name} · {ruleSet.state}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ops-form-actions">
            <button className="button" type="submit">
              Generate Payroll Run
            </button>
          </div>
        </form>
      </article>

      <article className="panel panel-span-2">
        <h2>Payroll Runs</h2>
        {filteredRuns.length === 0 ? (
          <p className="panel-subtitle">No payroll runs created yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Cycle</th>
                  <th>Status</th>
                  <th>Employees</th>
                  <th>Manual Settlement</th>
                  <th>Total Gross</th>
                  <th>Total Net</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((run) => {
                  const settlement = runSettlementSummary[String(run.id)] || {
                    paidAmount: 0,
                    paidCount: 0,
                    pendingAmount: 0,
                    pendingCount: 0,
                    totalCount: 0,
                  }

                  return (
                    <tr key={`run-${run.id}`}>
                      <td>{run.payrollRunCode}</td>
                      <td>
                        {typeof run.payrollCycle === 'object'
                          ? `${run.payrollCycle.month}/${run.payrollCycle.year}`
                          : run.payrollCycle}
                      </td>
                      <td>{PAYROLL_RUN_STATUS_LABELS[run.status as PayrollRunStatus] || run.status}</td>
                      <td>{run.totalEmployees || 0}</td>
                      <td>
                        <div className="payroll-run-settlement">
                          <strong>
                            {settlement.paidCount}/{settlement.totalCount || run.totalEmployees || 0} paid
                          </strong>
                          <span>Paid: {formatAmount(settlement.paidAmount)}</span>
                          <span>Outstanding: {formatAmount(settlement.pendingAmount)}</span>
                        </div>
                      </td>
                      <td>{formatAmount(run.totalGross)}</td>
                      <td>{formatAmount(run.totalNet)}</td>
                      <td>
                        <div className="public-actions">
                          <form action={APP_ROUTES.internal.hr.payrollLock} method="post">
                            <input name="runId" type="hidden" value={run.id} />
                            <button className="button button-secondary" type="submit">
                              Lock
                            </button>
                          </form>
                          <form action={APP_ROUTES.internal.hr.payrollApprove} method="post">
                            <input name="runId" type="hidden" value={run.id} />
                            <button className="button button-secondary" type="submit">
                              Approve
                            </button>
                          </form>
                          {razorpayReady ? (
                            <form action={APP_ROUTES.internal.hr.payrollDisburse} method="post">
                              <input name="runId" type="hidden" value={run.id} />
                              <button className="button" type="submit">
                                Disburse via RazorpayX
                              </button>
                            </form>
                          ) : (
                            <span className="status-pill payroll-payment-pill payroll-payment-pill-pending">
                              Manual mode
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Payroll Cycles</h2>
        {filteredCycles.length === 0 ? (
          <p className="panel-subtitle">No payroll cycles found.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Period</th>
                  <th>Payout Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCycles.map((cycle) => (
                  <tr key={`cycle-row-${cycle.id}`}>
                    <td>{cycle.payrollCycleCode}</td>
                    <td>
                      {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                    </td>
                    <td>{formatDate(cycle.payoutDate)}</td>
                    <td>{PAYROLL_CYCLE_STATUS_LABELS[cycle.status as PayrollCycleStatus] || cycle.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Employee Salary Register & History</h2>
        {filteredLineItems.length === 0 ? (
          <p className="panel-subtitle">No payroll line items available.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Run</th>
                  <th>Employee</th>
                  <th>Bank Details</th>
                  <th>Gross</th>
                  <th>Deductions</th>
                  <th>Net</th>
                  <th>Payment Status</th>
                  <th>Paid At</th>
                  <th>Reference</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLineItems.map((line) => {
                  const lineRecord = line as unknown as Record<string, unknown>
                  const paymentStatus = normalizePaymentStatus(lineRecord.paymentStatus)
                  const paymentModeLabel =
                    PAYROLL_PAYMENT_MODE_LABELS[
                      (lineRecord.paymentMode === 'razorpayx' ? 'razorpayx' : 'manual')
                    ]

                  return (
                    <tr key={`line-item-${line.id}`}>
                      <td>{getCycleLabel(lineRecord)}</td>
                      <td>{getRunCode(lineRecord)}</td>
                      <td>
                        <div className="payroll-employee-cell">
                          <strong>{getEmployeeName(lineRecord)}</strong>
                          <span>{getEmployeeCode(lineRecord)}</span>
                          <span>{getEmployeeDesignation(lineRecord)}</span>
                          <span>{getEmployeeEmail(lineRecord)}</span>
                        </div>
                      </td>
                      <td>{getEmployeeBankLine(lineRecord)}</td>
                      <td>{formatAmount(line.grossEarnings)}</td>
                      <td>
                        {formatAmount(line.totalDeductions)}
                        <div className="payroll-cell-subtle">LOP: {line.lopDays || 0} day(s)</div>
                      </td>
                      <td>{formatAmount(line.netPayable)}</td>
                      <td>
                        <div className="payroll-status-stack">
                          <span className={payrollPaymentPillClassName(paymentStatus)}>
                            {PAYROLL_PAYMENT_STATUS_LABELS[paymentStatus]}
                          </span>
                          <span className="payroll-cell-subtle">{paymentModeLabel}</span>
                        </div>
                      </td>
                      <td>{formatDateTime(line.paidAt)}</td>
                      <td>{line.paymentReference || '—'}</td>
                      <td>
                        <form action={APP_ROUTES.internal.hr.payrollPaymentStatus} className="row-form payroll-payment-form" method="post">
                          <input name="lineItemId" type="hidden" value={line.id} />
                          <input name="paymentNotes" type="hidden" value={String(line.paymentNotes || '')} />
                          <input
                            className="table-input"
                            defaultValue={String(line.paymentReference || '')}
                            name="paymentReference"
                            placeholder="Transfer ref / UTR"
                            type="text"
                          />
                          <div className="public-actions">
                            <button className="button" name="paymentStatus" type="submit" value="paid">
                              Mark Paid
                            </button>
                            <button className="button button-secondary" name="paymentStatus" type="submit" value="pending">
                              Pending
                            </button>
                            <button className="button button-secondary" name="paymentStatus" type="submit" value="notPaid">
                              Not Paid
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Recent Payout Transactions</h2>
        {filteredPayouts.length === 0 ? (
          <p className="panel-subtitle">No payout transactions yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Employee</th>
                  <th>Payout ID</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>UTR</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.map((txn) => (
                  <tr key={`txn-${txn.id}`}>
                    <td>{txn.payoutTxnCode}</td>
                    <td>{typeof txn.employee === 'object' ? txn.employee.employeeCode : txn.employee}</td>
                    <td>{txn.payoutID || '—'}</td>
                    <td>{txn.payoutStatus}</td>
                    <td>{txn.attemptCount || 0}</td>
                    <td>{txn.utr || '—'}</td>
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
