import configPromise from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { requireInternalUser } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS, type InternalRole } from '@/lib/constants/roles'
import { extractRelationshipID } from '@/lib/utils/relationships'

type WorkspaceCard = {
  cta: string
  description: string
  href: string
  key: string
  title: string
}

type RoleDashboardConfig = {
  subtitle: string
  title: string
  workspaces: readonly WorkspaceCard[]
}

type AlertCard = {
  label: string
  priority: 'high' | 'medium' | 'normal'
  value: number
}

const ROLE_DASHBOARD: Readonly<Record<InternalRole, RoleDashboardConfig>> = {
  admin: {
    title: 'Operations Home',
    subtitle: 'Manage ownership, delivery flow, and review quality across the recruitment team.',
    workspaces: [
      {
        key: 'ownership',
        title: 'Ownership Hub',
        description: 'Assign and rebalance clients and jobs across lead recruiters.',
        href: APP_ROUTES.internal.assignments.head,
        cta: 'Open Ownership Hub',
      },
      {
        key: 'allocation',
        title: 'Allocation Hub',
        description: 'Monitor recruiter bandwidth and assign jobs for execution.',
        href: APP_ROUTES.internal.assignments.lead,
        cta: 'Open Allocation Hub',
      },
      {
        key: 'jobs',
        title: 'Job Pipeline',
        description: 'Track active demand, priorities, and sourcing movement.',
        href: APP_ROUTES.internal.jobs.assigned,
        cta: 'Open Job Pipeline',
      },
      {
        key: 'applications',
        title: 'Review Desk',
        description: 'Clear pending internal reviews and decision bottlenecks.',
        href: APP_ROUTES.internal.applications.reviewQueue,
        cta: 'Open Review Desk',
      },
    ],
  },
  headRecruiter: {
    title: 'Head Recruiter Home',
    subtitle: 'Drive ownership distribution and keep team execution healthy.',
    workspaces: [
      {
        key: 'ownership',
        title: 'Ownership Hub',
        description: 'Distribute clients and jobs to lead recruiters.',
        href: APP_ROUTES.internal.assignments.head,
        cta: 'Open Ownership Hub',
      },
      {
        key: 'allocation',
        title: 'Allocation Monitor',
        description: 'Check recruiter coverage under your hierarchy.',
        href: APP_ROUTES.internal.assignments.lead,
        cta: 'Open Allocation Monitor',
      },
      {
        key: 'jobs',
        title: 'Job Pipeline',
        description: 'Track active jobs and priority closures.',
        href: APP_ROUTES.internal.jobs.assigned,
        cta: 'Open Job Pipeline',
      },
      {
        key: 'applications',
        title: 'Application Pipeline',
        description: 'Monitor applications and stage movement.',
        href: APP_ROUTES.internal.applications.list,
        cta: 'Open Application Pipeline',
      },
    ],
  },
  leadRecruiter: {
    title: 'Lead Recruiter Home',
    subtitle: 'Manage recruiter execution and complete internal reviews.',
    workspaces: [
      {
        key: 'allocation',
        title: 'Allocation Hub',
        description: 'Assign jobs to recruiters and rebalance workload.',
        href: APP_ROUTES.internal.assignments.lead,
        cta: 'Open Allocation Hub',
      },
      {
        key: 'jobs',
        title: 'Job Pipeline',
        description: 'Track assigned jobs and urgency.',
        href: APP_ROUTES.internal.jobs.assigned,
        cta: 'Open Job Pipeline',
      },
      {
        key: 'candidates',
        title: 'Candidate Bank',
        description: 'Review sourcing quality and profile completeness.',
        href: APP_ROUTES.internal.candidates.list,
        cta: 'Open Candidate Bank',
      },
      {
        key: 'review',
        title: 'Review Desk',
        description: 'Approve, reject, or send back recruiter submissions.',
        href: APP_ROUTES.internal.applications.reviewQueue,
        cta: 'Open Review Desk',
      },
    ],
  },
  recruiter: {
    title: 'Recruiter Home',
    subtitle: 'Execute sourcing quickly from assigned jobs through review submission.',
    workspaces: [
      {
        key: 'jobs',
        title: 'Job Pipeline',
        description: 'Start from assigned jobs and priority roles.',
        href: APP_ROUTES.internal.jobs.assigned,
        cta: 'Open Job Pipeline',
      },
      {
        key: 'candidateCreate',
        title: 'Add Candidate',
        description: 'Create external candidate profile with resume and source details.',
        href: APP_ROUTES.internal.candidates.new,
        cta: 'Add Candidate',
      },
      {
        key: 'applicationCreate',
        title: 'Create Application',
        description: 'Map candidate to job and move to internal review.',
        href: APP_ROUTES.internal.applications.new,
        cta: 'Create Application',
      },
      {
        key: 'applications',
        title: 'My Application Pipeline',
        description: 'Track submissions, corrections, and pending actions.',
        href: APP_ROUTES.internal.applications.list,
        cta: 'Open My Pipeline',
      },
    ],
  },
}

export default async function InternalDashboardPage() {
  const user = await requireInternalUser()
  const payload = await getPayload({ config: configPromise })
  const roleConfig = ROLE_DASHBOARD[user.role]
  const canManageLeadAssignments = user.role === 'admin' || user.role === 'headRecruiter'
  const canManageRecruiterAssignments =
    user.role === 'admin' || user.role === 'headRecruiter' || user.role === 'leadRecruiter'

  const [
    activeJobsCount,
    onHoldJobsCount,
    visibleCandidatesCount,
    visibleApplicationsCount,
    pendingReviewCount,
    pendingInviteCount,
    recruiterNeedsActionCount,
    unassignedClientCount,
    jobsWithoutRecruitersCount,
  ] = await Promise.all([
    payload.count({
      collection: 'jobs',
      overrideAccess: false,
      user,
      where: { status: { equals: 'active' } },
    }),
    payload.count({
      collection: 'jobs',
      overrideAccess: false,
      user,
      where: { status: { equals: 'onHold' } },
    }),
    payload.count({
      collection: 'candidates',
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'applications',
      overrideAccess: false,
      user,
    }),
    payload.count({
      collection: 'applications',
      overrideAccess: false,
      user,
      where: {
        stage: {
          equals: 'internalReviewPending',
        },
      },
    }),
    canManageRecruiterAssignments
      ? payload.count({
          collection: 'candidate-invites',
          overrideAccess: false,
          user,
          where: {
            status: {
              equals: 'pending',
            },
          },
        })
      : Promise.resolve({ totalDocs: 0 }),
    user.role === 'recruiter'
      ? payload.count({
          collection: 'applications',
          overrideAccess: false,
          user,
          where: {
            and: [
              {
                recruiter: {
                  equals: user.id,
                },
              },
              {
                stage: {
                  in: ['sourcedByRecruiter', 'sentBackForCorrection'],
                },
              },
            ],
          },
        })
      : Promise.resolve({ totalDocs: 0 }),
    canManageLeadAssignments
      ? (async () => {
          const [activeClients, activeClientAssignments] = await Promise.all([
            payload.find({
              collection: 'clients',
              depth: 0,
              limit: 1000,
              pagination: false,
              overrideAccess: false,
              select: {
                name: true,
              },
              user,
              where: {
                status: {
                  equals: 'active',
                },
              },
            }),
            payload.find({
              collection: 'client-lead-assignments',
              depth: 0,
              limit: 1000,
              pagination: false,
              overrideAccess: false,
              select: {
                client: true,
              },
              user,
              where: {
                status: {
                  equals: 'active',
                },
              },
            }),
          ])

          const assignedClientIDs = new Set(
            activeClientAssignments.docs
              .map((assignment) => extractRelationshipID(assignment.client))
              .filter(Boolean)
              .map((value) => String(value)),
          )

          return activeClients.docs.filter((client) => !assignedClientIDs.has(String(client.id))).length
        })()
      : Promise.resolve(0),
    canManageRecruiterAssignments
      ? (async () => {
          const [activeOrOnHoldJobs, activeRecruiterAssignments] = await Promise.all([
            payload.find({
              collection: 'jobs',
              depth: 0,
              limit: 1000,
              pagination: false,
              overrideAccess: false,
              select: {
                title: true,
              },
              user,
              where: {
                status: {
                  in: ['active', 'onHold'],
                },
              },
            }),
            payload.find({
              collection: 'recruiter-job-assignments',
              depth: 0,
              limit: 1000,
              pagination: false,
              overrideAccess: false,
              select: {
                job: true,
              },
              user,
              where: {
                status: {
                  equals: 'active',
                },
              },
            }),
          ])

          const assignedJobIDs = new Set(
            activeRecruiterAssignments.docs
              .map((assignment) => extractRelationshipID(assignment.job))
              .filter(Boolean)
              .map((value) => String(value)),
          )

          return activeOrOnHoldJobs.docs.filter((job) => !assignedJobIDs.has(String(job.id))).length
        })()
      : Promise.resolve(0),
  ])

  const actionCards: AlertCard[] = [
    {
      label: 'Pending Internal Reviews',
      value: pendingReviewCount.totalDocs,
      priority: pendingReviewCount.totalDocs > 10 ? 'high' : pendingReviewCount.totalDocs > 0 ? 'medium' : 'normal',
    },
    {
      label: 'Jobs Without Recruiter',
      value: jobsWithoutRecruitersCount,
      priority: jobsWithoutRecruitersCount > 0 ? 'high' : 'normal',
    },
    {
      label: 'Active Clients Without Lead',
      value: unassignedClientCount,
      priority: unassignedClientCount > 0 ? 'high' : 'normal',
    },
    {
      label: 'Pending Candidate Invites',
      value: pendingInviteCount.totalDocs,
      priority: pendingInviteCount.totalDocs > 0 ? 'medium' : 'normal',
    },
    {
      label: 'Recruiter Action Items',
      value: recruiterNeedsActionCount.totalDocs,
      priority: recruiterNeedsActionCount.totalDocs > 0 ? 'medium' : 'normal',
    },
  ]

  const todayChecklist = [
    user.role === 'recruiter'
      ? 'Open Job Pipeline and pick top priority assigned jobs.'
      : 'Open dashboard alerts and clear high-priority blockers first.',
    user.role === 'leadRecruiter'
      ? 'Close pending reviews with clear approve/reject/send-back comments.'
      : 'Review application pipeline and address bottlenecks.',
    user.role === 'admin' || user.role === 'headRecruiter'
      ? 'Ensure there are no ownership and recruiter assignment gaps.'
      : 'Verify candidate and application quality before handoff.',
  ]

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2 home-hero">
        <p className="eyebrow">{INTERNAL_ROLE_LABELS[user.role]}</p>
        <h1>{roleConfig.title}</h1>
        <p className="panel-intro">{roleConfig.subtitle}</p>
      </article>

      <article className="panel panel-span-2">
        <h2>My Workspaces</h2>
        <p className="panel-subtitle">Use these modules to manage your day like an HR operations suite.</p>
        <div className="workspace-grid">
          {roleConfig.workspaces.map((workspace) => (
            <article className="workspace-card" key={workspace.key}>
              <p className="workspace-title">{workspace.title}</p>
              <p className="workspace-desc">{workspace.description}</p>
              <div className="public-actions">
                <Link className="button button-secondary" href={workspace.href}>
                  {workspace.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Action Center</h2>
        <p className="panel-subtitle">Current operational alerts and pending queues.</p>
        <div className="alert-grid">
          {actionCards
            .filter((card) => card.value > 0 || card.label === 'Pending Internal Reviews')
            .map((card) => (
              <article className={`alert-card alert-${card.priority}`} key={card.label}>
                <p className="alert-value">{card.value}</p>
                <p className="alert-label">{card.label}</p>
              </article>
            ))}
        </div>
      </article>

      <article className="panel">
        <h2>Today Checklist</h2>
        <ul>
          {todayChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <article className="panel panel-span-2">
        <h2>Snapshot</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <p className="kpi-value">{activeJobsCount.totalDocs}</p>
            <p className="kpi-label">Active Jobs</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{onHoldJobsCount.totalDocs}</p>
            <p className="kpi-label">On Hold Jobs</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{visibleCandidatesCount.totalDocs}</p>
            <p className="kpi-label">Visible Candidates</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{visibleApplicationsCount.totalDocs}</p>
            <p className="kpi-label">Visible Applications</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-value">{pendingReviewCount.totalDocs}</p>
            <p className="kpi-label">Pending Internal Reviews</p>
          </div>
        </div>
      </article>
    </section>
  )
}
