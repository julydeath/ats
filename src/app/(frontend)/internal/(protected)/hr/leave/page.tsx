import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { SimpleBarChart, SimpleDonutChart } from '@/components/internal/charts/ATSCharts'
import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { LEAVE_REQUEST_STATUS_LABELS, type LeaveRequestStatus } from '@/lib/constants/hr'
import { ensureDefaultLeaveTypes } from '@/lib/hr/leave'
import {
  getAvailableLeaveActions,
  getLeaveQueueBuckets,
  LEAVE_WORKFLOW_ACTION_LABELS,
  type LeaveWorkflowAction,
} from '@/lib/hr/leave-workflow'
import type { InternalRole } from '@/lib/constants/roles'

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const readLabel = (value: unknown, fallback = 'Unknown'): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const typed = value as {
      employeeCode?: string
      email?: string
      fullName?: string
      key?: string
      name?: string
    }

    return typed.fullName || typed.name || typed.employeeCode || typed.key || typed.email || fallback
  }

  return fallback
}

const toLeaveStatusLabel = (value: unknown): string => {
  const status = String(value || '') as LeaveRequestStatus

  if (status in LEAVE_REQUEST_STATUS_LABELS) {
    return LEAVE_REQUEST_STATUS_LABELS[status]
  }

  return String(value || 'Unknown')
}

type LeavePageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>
}

type LeaveQueueType = 'lead' | 'admin' | 'override'

const APPROVAL_ACTIONS_BY_QUEUE: Record<LeaveQueueType, LeaveWorkflowAction> = {
  admin: 'adminApprove',
  lead: 'leadApprove',
  override: 'adminOverrideApprove',
}

const shouldRequireOverrideReason = (queueType: LeaveQueueType): boolean =>
  queueType === 'override'

export default async function InternalHRLeavePage({ searchParams }: LeavePageProps) {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])
  const payload = await getPayload({ config: configPromise })
  const resolved = (await searchParams) || {}

  const reqLike = { payload, user } as any
  await ensureDefaultLeaveTypes(reqLike)

  const employeeProfileResult = await payload.find({
    collection: 'employee-profiles',
    depth: 0,
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

  const employeeProfile = employeeProfileResult.docs[0]
  const employeeProfileID = employeeProfile?.id
  const recruiterMissingProfile = user.role === 'recruiter' && !employeeProfileID

  const [leaveTypesResult, leaveRequestsResult, leaveBalancesResult] = await Promise.all([
    payload.find({
      collection: 'leave-types',
      depth: 0,
      limit: 30,
      overrideAccess: false,
      sort: 'key',
      user,
      where: {
        isActive: {
          equals: true,
        },
      },
    }),
    recruiterMissingProfile
      ? Promise.resolve({ docs: [] as any[] })
      : payload.find({
          collection: 'leave-requests',
          depth: 2,
          limit: 120,
          overrideAccess: false,
          sort: '-createdAt',
          user,
          where:
            user.role === 'recruiter' && employeeProfileID
              ? {
                  employee: {
                    equals: employeeProfileID,
                  },
                }
              : undefined,
        }),
    recruiterMissingProfile
      ? Promise.resolve({ docs: [] as any[] })
      : payload.find({
          collection: 'leave-balances',
          depth: 2,
          limit: 24,
          overrideAccess: false,
          sort: 'leaveType',
          user,
          where: {
            and: [
              user.role === 'recruiter' && employeeProfileID
                ? {
                    employee: {
                      equals: employeeProfileID,
                    },
                  }
                : {},
              {
                year: {
                  equals: new Date().getFullYear(),
                },
              },
            ],
          },
        }),
  ])

  const leaveRequests = leaveRequestsResult.docs
  const leaveBalances = leaveBalancesResult.docs

  const needsLeadAction = leaveRequests.filter((request) => {
    const buckets = getLeaveQueueBuckets({
      employeeRole: (String(request.employeeRole || 'recruiter') as InternalRole) || 'recruiter',
      role: user.role,
      status: request.status,
    })

    return buckets.needsLeadAction
  })

  const needsAdminAction = leaveRequests.filter((request) => {
    const buckets = getLeaveQueueBuckets({
      employeeRole: (String(request.employeeRole || 'recruiter') as InternalRole) || 'recruiter',
      role: user.role,
      status: request.status,
    })

    return buckets.needsAdminAction
  })

  const adminOverrideEligible = leaveRequests.filter((request) => {
    const buckets = getLeaveQueueBuckets({
      employeeRole: (String(request.employeeRole || 'recruiter') as InternalRole) || 'recruiter',
      role: user.role,
      status: request.status,
    })

    return buckets.adminOverrideEligible
  })

  const leaveStatusCounts = leaveRequests.reduce<Record<string, number>>((acc, request) => {
    const status = String(request.status || 'draft')
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const leaveStatusChartData = Object.entries(leaveStatusCounts).map(([status, value]) => ({
    label: LEAVE_REQUEST_STATUS_LABELS[status as LeaveRequestStatus] || status,
    value,
  }))

  const leaveTypeCounts = leaveRequests.reduce<Record<string, number>>((acc, request) => {
    const leaveTypeLabel = readLabel(request.leaveType, 'Leave')
    acc[leaveTypeLabel] = (acc[leaveTypeLabel] || 0) + 1
    return acc
  }, {})

  const leaveTypeChartData = Object.entries(leaveTypeCounts).map(([label, value]) => ({
    label,
    value,
  }))

  const queueChartData = [
    { label: 'Lead Queue', value: needsLeadAction.length },
    { label: 'Admin Queue', value: needsAdminAction.length },
    { label: 'Override', value: adminOverrideEligible.length },
  ].filter((row) => row.value > 0 || user.role === 'admin')

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">HRMS · Leave</p>
        <h1>Leave Management</h1>
        <p className="panel-intro">
          Apply leave, review approvals by stage, and track all audit actions from one workflow.
        </p>
        {resolved.success ? <p className="panel-subtitle">Success: {resolved.success}</p> : null}
        {resolved.error ? <p className="panel-subtitle" style={{ color: '#b91c1c' }}>Error: {resolved.error}</p> : null}
      </article>

      <article className="panel">
        <h2>{user.role === 'admin' ? 'Leave Controls' : 'Apply Leave'}</h2>
        {user.role === 'admin' ? (
          <p className="panel-subtitle">
            Admin accounts do not submit leaves. Use the action queues below for approvals and overrides.
          </p>
        ) : recruiterMissingProfile ? (
          <p className="panel-subtitle" style={{ color: '#b91c1c' }}>
            Employee profile is missing. Ask admin to map your employee profile before applying for leave.
          </p>
        ) : (
          <form action={APP_ROUTES.internal.hr.leaveApply} className="row-form" method="post">
            <label>
              Leave Type
              <select name="leaveTypeId" required>
                <option value="">Select</option>
                {leaveTypesResult.docs.map((leaveType) => (
                  <option key={`leave-type-${leaveType.id}`} value={leaveType.id}>
                    {leaveType.key} · {leaveType.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unit
              <select defaultValue="fullDay" name="leaveUnit">
                <option value="fullDay">Full Day</option>
                <option value="halfDay">Half Day</option>
              </select>
            </label>
            <label>
              Start Date
              <input name="startDate" required type="date" />
            </label>
            <label>
              End Date
              <input name="endDate" required type="date" />
            </label>
            <label>
              Reason
              <textarea name="reason" placeholder="Reason for leave" required rows={3} />
            </label>
            <button className="button" type="submit">
              Submit Leave Request
            </button>
          </form>
        )}
      </article>

      <article className="panel">
        <h2>Current Year Balances</h2>
        {leaveBalances.length === 0 ? (
          <p className="panel-subtitle">No leave balances available yet.</p>
        ) : (
          <ul>
            {leaveBalances.map((balance) => (
              <li key={`balance-${balance.id}`}>
                {typeof balance.leaveType === 'object' ? balance.leaveType.key : 'Leave'}: {balance.closingBalance || 0} days
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel panel-span-2">
        <h2>Leave Insights</h2>
        <div
          style={{
            display: 'grid',
            gap: '0.85rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          <div>
            <p className="panel-subtitle">Request Status Distribution</p>
            {leaveStatusChartData.length === 0 ? (
              <p className="panel-subtitle">No leave requests yet.</p>
            ) : (
              <SimpleDonutChart ariaLabel="Leave status distribution" data={leaveStatusChartData} />
            )}
          </div>
          <div>
            <p className="panel-subtitle">Leave Type Usage</p>
            {leaveTypeChartData.length === 0 ? (
              <p className="panel-subtitle">No leave type usage yet.</p>
            ) : (
              <SimpleBarChart ariaLabel="Leave type usage" data={leaveTypeChartData} />
            )}
          </div>
          {(user.role === 'admin' || user.role === 'leadRecruiter') ? (
            <div>
              <p className="panel-subtitle">Approval Queue Load</p>
              {queueChartData.length === 0 ? (
                <p className="panel-subtitle">No pending queues.</p>
              ) : (
                <SimpleBarChart ariaLabel="Leave queue load" data={queueChartData} />
              )}
            </div>
          ) : null}
        </div>
      </article>

      <article className="panel panel-span-2">
        <h2>{user.role === 'recruiter' ? 'My Leave Requests' : 'Team Leave Requests'}</h2>
        {leaveRequests.length === 0 ? (
          <p className="panel-subtitle">No leave requests found.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Date Span</th>
                  <th>Total</th>
                  <th>Reason</th>
                  <th>Requester</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((request) => {
                  const availableActions = getAvailableLeaveActions({
                    actorID: user.id,
                    actorRole: user.role,
                    currentStatus: request.status,
                    employeeRole: (String(request.employeeRole || 'recruiter') as InternalRole) || 'recruiter',
                    requestedByID:
                      typeof request.requestedBy === 'number' || typeof request.requestedBy === 'string'
                        ? request.requestedBy
                        : typeof request.requestedBy === 'object' && request.requestedBy !== null
                          ? request.requestedBy.id
                          : null,
                  })

                  const canCancel = availableActions.includes('cancel')

                  return (
                    <tr key={`leave-request-${request.id}`}>
                      <td>{request.leaveRequestCode}</td>
                      <td>{readLabel(request.employee, 'Unmapped')}</td>
                      <td>
                        {readLabel(request.leaveType, 'Leave')} · {request.leaveUnit === 'halfDay' ? 'Half Day' : 'Full Day'}
                      </td>
                      <td>
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </td>
                      <td>{request.totalDays}</td>
                      <td>{request.reason}</td>
                      <td>{readLabel(request.requestedBy, 'Unknown')}</td>
                      <td>{toLeaveStatusLabel(request.status)}</td>
                      <td>
                        {canCancel ? (
                          <form action={APP_ROUTES.internal.hr.leaveAction} method="post">
                            <input name="leaveRequestId" type="hidden" value={request.id} />
                            <input name="action" type="hidden" value="cancel" />
                            <button className="button button-secondary" type="submit">
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <span className="panel-subtitle">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {user.role === 'leadRecruiter' ? (
        <LeaveQueueSection
          queueType="lead"
          requests={needsLeadAction}
          title="Needs Lead Action"
        />
      ) : null}

      {user.role === 'admin' ? (
        <>
          <LeaveQueueSection
            queueType="admin"
            requests={needsAdminAction}
            title="Needs Admin Action"
          />
          <LeaveQueueSection
            queueType="override"
            requests={adminOverrideEligible}
            title="Admin Override Eligible"
          />
        </>
      ) : null}
    </section>
  )
}

function LeaveQueueSection({
  queueType,
  requests,
  title,
}: {
  queueType: LeaveQueueType
  requests: any[]
  title: string
}) {
  const approveAction = APPROVAL_ACTIONS_BY_QUEUE[queueType]
  const needsOverrideReason = shouldRequireOverrideReason(queueType)

  return (
    <article className="panel panel-span-2">
      <h2>{title}</h2>
      {requests.length === 0 ? (
        <p className="panel-subtitle">No leave requests in this queue.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Date Span</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={`queue-${queueType}-${request.id}`}>
                  <td>{request.leaveRequestCode}</td>
                  <td>{readLabel(request.employee, 'Unmapped')}</td>
                  <td>
                    {readLabel(request.leaveType, 'Leave')} · {request.leaveUnit === 'halfDay' ? 'Half Day' : 'Full Day'}
                  </td>
                  <td>
                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                  </td>
                  <td>{request.reason}</td>
                  <td>{toLeaveStatusLabel(request.status)}</td>
                  <td>
                    <div className="public-actions" style={{ alignItems: 'stretch', flexDirection: 'column', gap: 8 }}>
                      <form action={APP_ROUTES.internal.hr.leaveAction} className="row-form" method="post">
                        <input name="leaveRequestId" type="hidden" value={request.id} />
                        <input name="action" type="hidden" value={approveAction} />
                        <input name="comment" placeholder="Comment (optional)" type="text" />
                        {needsOverrideReason ? (
                          <input name="overrideReason" placeholder="Override reason" required type="text" />
                        ) : null}
                        <button className="button" type="submit">
                          {LEAVE_WORKFLOW_ACTION_LABELS[approveAction]}
                        </button>
                      </form>

                      <form action={APP_ROUTES.internal.hr.leaveAction} className="row-form" method="post">
                        <input name="leaveRequestId" type="hidden" value={request.id} />
                        <input name="action" type="hidden" value="reject" />
                        <input name="comment" placeholder="Rejection reason" required type="text" />
                        {needsOverrideReason ? (
                          <input name="overrideReason" placeholder="Override reason" required type="text" />
                        ) : null}
                        <button className="button button-secondary" type="submit">
                          Reject
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
  )
}
