import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { HRPayrollBarChart, SimpleDonutChart } from '@/components/internal/charts/ATSCharts'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import {
  PAYROLL_RUN_STATUS_LABELS,
  PAYROLL_CYCLE_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  type PayrollRunStatus,
  type PayrollCycleStatus,
  type PayoutStatus,
} from '@/lib/constants/hr'

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

type PayrollPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>
}

export default async function InternalHRPayrollPage({ searchParams }: PayrollPageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolved = (await searchParams) || {}

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
      limit: 30,
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
      depth: 1,
      limit: 20,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'payroll-payout-transactions',
      depth: 1,
      limit: 20,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
  ])

  const payrollTrendChartData = runs.docs
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

  const runStatusCounts = runs.docs.reduce<Record<string, number>>((acc, run) => {
    const key = String(run.status || 'draft')
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const runStatusChartData = Object.entries(runStatusCounts).map(([status, value]) => ({
    label: PAYROLL_RUN_STATUS_LABELS[status as PayrollRunStatus] || status,
    value,
  }))

  const payoutStatusCounts = payouts.docs.reduce<Record<string, number>>((acc, payout) => {
    const key = String(payout.payoutStatus || 'queued')
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const payoutStatusChartData = Object.entries(payoutStatusCounts).map(([status, value]) => ({
    label: PAYOUT_STATUS_LABELS[status as PayoutStatus] || status,
    value,
  }))

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">HRMS · Payroll</p>
        <h1>India Payroll Engine</h1>
        <p className="panel-intro">
          Full cycle payroll operations with maker-checker approval and RazorpayX disbursement.
        </p>
        {resolved.success ? <p className="panel-subtitle">Success: {resolved.success}</p> : null}
        {resolved.error ? <p className="panel-subtitle" style={{ color: '#b91c1c' }}>Error: {resolved.error}</p> : null}
      </article>

      <article className="panel">
        <h2>What This Page Does</h2>
        <ul>
          <li>Creates payroll cycle for month and payout date.</li>
          <li>Generates run from attendance + compensation data.</li>
          <li>Supports lock, approve, and disburse states with audit trail.</li>
        </ul>
      </article>

      <article className="panel">
        <h2>Operational Sequence</h2>
        <ol>
          <li>Create cycle</li>
          <li>Generate run</li>
          <li>Lock run</li>
          <li>Approve run</li>
          <li>Disburse payouts</li>
        </ol>
        <p className="panel-subtitle">
          Maker-checker is enforced when 2+ active admins are available. For single-admin setups,
          approval is allowed and audit-noted automatically.
        </p>
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
            {payrollTrendChartData.length === 0 ? (
              <p className="panel-subtitle">No run totals available yet.</p>
            ) : (
              <HRPayrollBarChart data={payrollTrendChartData} />
            )}
          </div>
          <div>
            <p className="panel-subtitle">Run Status Distribution</p>
            {runStatusChartData.length === 0 ? (
              <p className="panel-subtitle">No payroll runs available.</p>
            ) : (
              <SimpleDonutChart ariaLabel="Payroll run status distribution" data={runStatusChartData} />
            )}
          </div>
          <div>
            <p className="panel-subtitle">Payout Status Distribution</p>
            {payoutStatusChartData.length === 0 ? (
              <p className="panel-subtitle">No payout transactions available.</p>
            ) : (
              <SimpleDonutChart ariaLabel="Payout status distribution" data={payoutStatusChartData} />
            )}
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
        {runs.docs.length === 0 ? (
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
                  <th>Total Gross</th>
                  <th>Total Net</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.docs.map((run) => (
                  <tr key={`run-${run.id}`}>
                    <td>{run.payrollRunCode}</td>
                    <td>
                      {typeof run.payrollCycle === 'object'
                        ? `${run.payrollCycle.month}/${run.payrollCycle.year}`
                        : run.payrollCycle}
                    </td>
                    <td>{PAYROLL_RUN_STATUS_LABELS[run.status as PayrollRunStatus] || run.status}</td>
                    <td>{run.totalEmployees || 0}</td>
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
                        <form action={APP_ROUTES.internal.hr.payrollDisburse} method="post">
                          <input name="runId" type="hidden" value={run.id} />
                          <button className="button" type="submit">
                            Disburse
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Payroll Cycles</h2>
        {cycles.docs.length === 0 ? (
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
                {cycles.docs.map((cycle) => (
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
        <h2>Recent Line Items</h2>
        {lineItems.docs.length === 0 ? (
          <p className="panel-subtitle">No payroll line items available.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Employee</th>
                  <th>Gross</th>
                  <th>Deductions</th>
                  <th>Net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.docs.map((line) => (
                  <tr key={`line-item-${line.id}`}>
                    <td>{typeof line.payrollRun === 'object' ? line.payrollRun.payrollRunCode : line.payrollRun}</td>
                    <td>{typeof line.employee === 'object' ? line.employee.employeeCode : line.employee}</td>
                    <td>{formatAmount(line.grossEarnings)}</td>
                    <td>{formatAmount(line.totalDeductions)}</td>
                    <td>{formatAmount(line.netPayable)}</td>
                    <td>{line.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Recent Payout Transactions</h2>
        {payouts.docs.length === 0 ? (
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
                {payouts.docs.map((txn) => (
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
