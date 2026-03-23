import { APP_ROUTES } from '@/lib/constants/routes'
import type { InternalRole } from '@/lib/constants/roles'

export type InternalNavItem = {
  description: string
  href: string
  label: string
}

export type InternalNavGroup = {
  items: readonly InternalNavItem[]
  title: string
}

const ADMIN_NAV: readonly InternalNavGroup[] = [
  {
    title: 'Workspaces',
    items: [
      {
        label: 'Home',
        href: APP_ROUTES.internal.dashboard,
        description: 'Daily summary, alerts, and priority queues.',
      },
      {
        label: 'Ownership Hub',
        href: APP_ROUTES.internal.assignments.head,
        description: 'Assign clients/jobs to leads and rebalance.',
      },
      {
        label: 'Allocation Hub',
        href: APP_ROUTES.internal.assignments.lead,
        description: 'Assign jobs to recruiters and monitor load.',
      },
      {
        label: 'Job Pipeline',
        href: APP_ROUTES.internal.jobs.assigned,
        description: 'Track active demand and sourcing momentum.',
      },
      {
        label: 'Candidate Bank',
        href: APP_ROUTES.internal.candidates.list,
        description: 'Review sourced candidate records.',
      },
      {
        label: 'Application Pipeline',
        href: APP_ROUTES.internal.applications.list,
        description: 'Track submissions and internal stage movement.',
      },
      {
        label: 'Review Desk',
        href: APP_ROUTES.internal.applications.reviewQueue,
        description: 'Approve, reject, or send back submissions.',
      },
    ],
  },
]

const HEAD_RECRUITER_NAV: readonly InternalNavGroup[] = [
  {
    title: 'Workspaces',
    items: [
      {
        label: 'Home',
        href: APP_ROUTES.internal.dashboard,
        description: 'Team load, pending reviews, and assignment health.',
      },
      {
        label: 'Ownership Hub',
        href: APP_ROUTES.internal.assignments.head,
        description: 'Assign or rebalance client and job ownership.',
      },
      {
        label: 'Allocation Monitor',
        href: APP_ROUTES.internal.assignments.lead,
        description: 'Monitor recruiter coverage by job.',
      },
      {
        label: 'Job Pipeline',
        href: APP_ROUTES.internal.jobs.assigned,
        description: 'Track job demand and velocity.',
      },
      {
        label: 'Candidate Bank',
        href: APP_ROUTES.internal.candidates.list,
        description: 'Monitor sourced candidate quality.',
      },
      {
        label: 'Application Pipeline',
        href: APP_ROUTES.internal.applications.list,
        description: 'Monitor movement through internal stages.',
      },
      {
        label: 'Review Desk',
        href: APP_ROUTES.internal.applications.reviewQueue,
        description: 'Monitor pending lead recruiter decisions.',
      },
    ],
  },
]

const LEAD_RECRUITER_NAV: readonly InternalNavGroup[] = [
  {
    title: 'Workspaces',
    items: [
      {
        label: 'Home',
        href: APP_ROUTES.internal.dashboard,
        description: 'Assigned load, pending reviews, and recruiter balance.',
      },
      {
        label: 'Allocation Hub',
        href: APP_ROUTES.internal.assignments.lead,
        description: 'Assign jobs to recruiters and rebalance.',
      },
      {
        label: 'Job Pipeline',
        href: APP_ROUTES.internal.jobs.assigned,
        description: 'Track assigned jobs and priorities.',
      },
      {
        label: 'Candidate Bank',
        href: APP_ROUTES.internal.candidates.list,
        description: 'Review sourced candidates by recruiters.',
      },
      {
        label: 'Application Pipeline',
        href: APP_ROUTES.internal.applications.list,
        description: 'Inspect recruiter submissions.',
      },
      {
        label: 'Review Desk',
        href: APP_ROUTES.internal.applications.reviewQueue,
        description: 'Approve, reject, or send back submissions.',
      },
    ],
  },
]

const RECRUITER_NAV: readonly InternalNavGroup[] = [
  {
    title: 'Workspaces',
    items: [
      {
        label: 'Home',
        href: APP_ROUTES.internal.dashboard,
        description: 'My assigned jobs and pending actions.',
      },
      {
        label: 'Job Pipeline',
        href: APP_ROUTES.internal.jobs.assigned,
        description: 'Open assigned jobs and pick target role.',
      },
      {
        label: 'Candidate Bank',
        href: APP_ROUTES.internal.candidates.list,
        description: 'Verify candidate details before submission.',
      },
      {
        label: 'Application Pipeline',
        href: APP_ROUTES.internal.applications.list,
        description: 'Submit and track lead recruiter review.',
      },
    ],
  },
  {
    title: 'Quick Create',
    items: [
      {
        label: 'Add Candidate',
        href: APP_ROUTES.internal.candidates.new,
        description: 'Create a new candidate master profile.',
      },
      {
        label: 'Create Application',
        href: APP_ROUTES.internal.applications.new,
        description: 'Map candidate to job and submit for review.',
      },
    ],
  },
]

export const INTERNAL_NAVIGATION_BY_ROLE: Readonly<Record<InternalRole, readonly InternalNavGroup[]>> = {
  admin: ADMIN_NAV,
  headRecruiter: HEAD_RECRUITER_NAV,
  leadRecruiter: LEAD_RECRUITER_NAV,
  recruiter: RECRUITER_NAV,
}

export const getInternalNavigationByRole = (role: InternalRole): readonly InternalNavGroup[] =>
  INTERNAL_NAVIGATION_BY_ROLE[role]
