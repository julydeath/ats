import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { SimpleBarChart, SimpleDonutChart } from '@/components/internal/charts/ATSCharts'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { PERFORMANCE_REVIEW_STATUS_LABELS } from '@/lib/constants/hr'

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

type PerformancePageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>
}

export default async function InternalHRPerformancePage({ searchParams }: PerformancePageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolved = (await searchParams) || {}

  const [cycles, snapshots, reviews, employees] = await Promise.all([
    payload.find({
      collection: 'performance-cycles',
      depth: 0,
      limit: 24,
      overrideAccess: false,
      sort: '-year',
      user,
    }),
    payload.find({
      collection: 'performance-snapshots',
      depth: 2,
      limit: 50,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'performance-reviews',
      depth: 2,
      limit: 50,
      overrideAccess: false,
      sort: '-updatedAt',
      user,
    }),
    payload.find({
      collection: 'employee-profiles',
      depth: 1,
      limit: 200,
      overrideAccess: false,
      sort: 'employeeCode',
      user,
    }),
  ])

  const reviewableEmployees = employees.docs.filter((employee) => {
    const linkedUser = typeof employee.user === 'object' ? employee.user : null

    if (!linkedUser) return false

    const role = String(linkedUser.role || '')

    if (user.role === 'leadRecruiter') {
      return role === 'recruiter'
    }

    if (user.role === 'admin') {
      return role === 'leadRecruiter' || role === 'recruiter'
    }

    return false
  })

  const snapshotTrendData = snapshots.docs.slice(0, 6).map((snapshot) => ({
    label:
      typeof snapshot.employee === 'object'
        ? snapshot.employee.employeeCode || String(snapshot.employee.id)
        : String(snapshot.employee),
    value: snapshot.kpiScore || 0,
  }))

  const reviewStatusCounts = reviews.docs.reduce(
    (acc, review) => {
      const key = String(review.status || 'draft')
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const reviewStatusData = Object.entries(reviewStatusCounts).map(([status, count]) => ({
    label: PERFORMANCE_REVIEW_STATUS_LABELS[status as keyof typeof PERFORMANCE_REVIEW_STATUS_LABELS] || status,
    value: count,
  }))

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">HRMS · Performance</p>
        <h1>Performance Engine</h1>
        <p className="panel-intro">
          Hybrid model with ATS KPI snapshots and manager reviews (70/30 default weight).
        </p>
        {resolved.success ? <p className="panel-subtitle">Success: {resolved.success}</p> : null}
        {resolved.error ? <p className="panel-subtitle" style={{ color: '#b91c1c' }}>Error: {resolved.error}</p> : null}
      </article>

      <article className="panel">
        <h2>What This Page Does</h2>
        <ul>
          <li>Generates monthly KPI snapshots from ATS activity.</li>
          <li>Captures manager rating and comments per cycle.</li>
          <li>Produces final weighted score for appraisal workflow.</li>
        </ul>
      </article>

      <article className="panel">
        <h2>Recommended Flow</h2>
        <ol>
          <li>Open cycle and generate KPI snapshots.</li>
          <li>Submit manager reviews for direct reports.</li>
          <li>Finalize review scores and share outcomes.</li>
        </ol>
      </article>

      <article className="panel panel-span-2">
        <h2>Visual Summary</h2>
        <div
          style={{
            display: 'grid',
            gap: '0.7rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          <div>
            <p className="panel-subtitle">KPI Snapshot Scores</p>
            {snapshotTrendData.length === 0 ? (
              <p className="panel-subtitle">No KPI snapshots yet.</p>
            ) : (
              <SimpleBarChart ariaLabel="KPI scores by employee" data={snapshotTrendData} />
            )}
          </div>
          <div>
            <p className="panel-subtitle">Review Status Distribution</p>
            {reviewStatusData.length === 0 ? (
              <p className="panel-subtitle">No review records yet.</p>
            ) : (
              <SimpleDonutChart ariaLabel="Review status distribution" data={reviewStatusData} />
            )}
          </div>
        </div>
      </article>

      {user.role === 'admin' ? (
        <article className="panel">
          <h2>Generate KPI Snapshot</h2>
          <form action={APP_ROUTES.internal.hr.performanceGenerate} className="ops-form-shell ops-form-shell-strong" method="post">
            <div className="ops-form-grid">
              <label className="ops-form-field">
                <span>Cycle</span>
                <select name="cycleId" required>
                  <option value="">Select cycle</option>
                  {cycles.docs.map((cycle) => (
                    <option key={`cycle-generate-${cycle.id}`} value={cycle.id}>
                      {cycle.title || `${cycle.month}/${cycle.year}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="ops-form-actions">
              <button className="button" type="submit">
                Generate KPI Snapshots
              </button>
            </div>
          </form>
        </article>
      ) : null}

      {(user.role === 'admin' || user.role === 'leadRecruiter') ? (
        <article className="panel">
          <h2>Submit Manager Review</h2>
          <form action={APP_ROUTES.internal.hr.performanceReview} className="ops-form-shell ops-form-shell-strong" method="post">
            <div className="ops-form-grid ops-form-grid-2">
              <label className="ops-form-field">
                <span>Cycle</span>
                <select name="cycleId" required>
                  <option value="">Select cycle</option>
                  {cycles.docs.map((cycle) => (
                    <option key={`cycle-review-${cycle.id}`} value={cycle.id}>
                      {cycle.title || `${cycle.month}/${cycle.year}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ops-form-field">
                <span>Employee</span>
                <select name="employeeId" required>
                  <option value="">Select employee</option>
                  {reviewableEmployees.map((employee) => (
                    <option key={`employee-review-${employee.id}`} value={employee.id}>
                      {employee.employeeCode} · {typeof employee.user === 'object' ? employee.user.fullName : employee.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ops-form-field">
                <span>Manager Rating (1 to 5)</span>
                <input max={5} min={1} name="managerRating" required step={0.1} type="number" />
              </label>
              <label className="ops-form-field">
                <span>Comments</span>
                <textarea name="managerComments" rows={3} />
              </label>
            </div>
            <div className="ops-form-actions">
              <button className="button" type="submit">
                Save Manager Review
              </button>
            </div>
          </form>
        </article>
      ) : null}

      <article className="panel panel-span-2">
        <h2>Recent KPI Snapshots</h2>
        {snapshots.docs.length === 0 ? (
          <p className="panel-subtitle">No KPI snapshots generated yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Employee</th>
                  <th>KPI Score</th>
                  <th>Submissions</th>
                  <th>Interviews</th>
                  <th>Placements</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.docs.map((snapshot) => (
                  <tr key={`snapshot-${snapshot.id}`}>
                    <td>{typeof snapshot.cycle === 'object' ? snapshot.cycle.title : snapshot.cycle}</td>
                    <td>{typeof snapshot.employee === 'object' ? snapshot.employee.employeeCode : snapshot.employee}</td>
                    <td>{snapshot.kpiScore || 0}</td>
                    <td>{snapshot.submissionsCount || 0}</td>
                    <td>{snapshot.interviewCount || 0}</td>
                    <td>{snapshot.placementCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Manager Reviews</h2>
        {reviews.docs.length === 0 ? (
          <p className="panel-subtitle">No reviews found.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Review Code</th>
                  <th>Employee</th>
                  <th>Reviewer</th>
                  <th>Cycle</th>
                  <th>Rating</th>
                  <th>Final Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reviews.docs.map((review) => (
                  <tr key={`review-${review.id}`}>
                    <td>{review.reviewCode}</td>
                    <td>{typeof review.employee === 'object' ? review.employee.employeeCode : review.employee}</td>
                    <td>{typeof review.reviewer === 'object' ? review.reviewer.fullName : review.reviewer}</td>
                    <td>{typeof review.cycle === 'object' ? review.cycle.title : review.cycle}</td>
                    <td>{review.managerRating}</td>
                    <td>{review.finalScore || 0}</td>
                    <td>{PERFORMANCE_REVIEW_STATUS_LABELS[review.status] || review.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {cycles.docs[0] ? (
        <article className="panel panel-span-2">
          <h2>Cycle Calendar</h2>
          <p className="panel-subtitle">
            Current cycle: {cycles.docs[0].title || `${cycles.docs[0].month}/${cycles.docs[0].year}`} ·
            {` ${formatDate(cycles.docs[0].startDate)} - ${formatDate(cycles.docs[0].endDate)}`}
          </p>
        </article>
      ) : null}
    </section>
  )
}
