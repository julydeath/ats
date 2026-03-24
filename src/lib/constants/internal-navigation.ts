import { APP_ROUTES } from '@/lib/constants/routes'
import type { InternalRole } from '@/lib/constants/roles'

export type InternalNavItem = {
  description: string
  href: string
  icon?:
    | 'applications'
    | 'assignments'
    | 'candidates'
    | 'clients'
    | 'dashboard'
    | 'jobs'
    | 'review'
    | 'schedule'
    | 'settings'
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
        label: 'Dashboard',
        href: APP_ROUTES.internal.dashboard,
        description: 'Daily summary and action queue.',
        icon: 'dashboard',
      },
      {
        label: 'Clients',
        href: APP_ROUTES.internal.clients.list,
        description: 'Create and manage client master records.',
        icon: 'clients',
      },
      {
        label: 'Jobs',
        href: APP_ROUTES.internal.jobs.assigned,
        description: 'View and monitor active jobs.',
        icon: 'jobs',
      },
      {
        label: 'Candidates',
        href: APP_ROUTES.internal.candidates.list,
        description: 'View sourced candidate records.',
        icon: 'candidates',
      },
      {
        label: 'Reports',
        href: APP_ROUTES.internal.applications.list,
        description: 'View reporting and workflow summaries.',
        icon: 'applications',
      },
      {
        label: 'Settings',
        href: APP_ROUTES.internal.settings,
        description: 'Manage platform settings and users.',
        icon: 'settings',
      },
    ],
  },
]

const LEAD_RECRUITER_NAV: readonly InternalNavGroup[] = [
  {
    title: 'Workspaces',
    items: [
      {
        label: 'Dashboard',
        href: APP_ROUTES.internal.dashboard,
        description: 'Assigned load, pending reviews, and recruiter balance.',
        icon: 'dashboard',
      },
      {
        label: 'Jobs',
        href: APP_ROUTES.internal.jobs.assigned,
        description: 'Track assigned jobs and priorities.',
        icon: 'jobs',
      },
      {
        label: 'Recruiters',
        href: APP_ROUTES.internal.assignments.lead,
        description: 'Assign jobs to recruiters and rebalance capacity.',
        icon: 'assignments',
      },
      {
        label: 'Review Queue',
        href: APP_ROUTES.internal.applications.reviewQueue,
        description: 'Approve, reject, or send back submissions.',
        icon: 'review',
      },
      {
        label: 'Reports',
        href: APP_ROUTES.internal.applications.list,
        description: 'Track application pipeline and review outcomes.',
        icon: 'applications',
      },
    ],
  },
]

const RECRUITER_NAV: readonly InternalNavGroup[] = [
  {
    title: 'Workspaces',
    items: [
      {
        label: 'Dashboard',
        href: APP_ROUTES.internal.dashboard,
        description: 'My assigned jobs and pending actions.',
        icon: 'dashboard',
      },
      {
        label: 'My Jobs',
        href: APP_ROUTES.internal.jobs.assigned,
        description: 'Open assigned jobs and move applicants.',
        icon: 'jobs',
      },
      {
        label: 'Candidates',
        href: APP_ROUTES.internal.candidates.list,
        description: 'Verify candidate details before submission.',
        icon: 'candidates',
      },
      {
        label: 'My Applications',
        href: APP_ROUTES.internal.applications.list,
        description: 'Submit and track lead recruiter review.',
        icon: 'applications',
      },
    ],
  },
]

export const INTERNAL_NAVIGATION_BY_ROLE: Readonly<Record<InternalRole, readonly InternalNavGroup[]>> = {
  admin: ADMIN_NAV,
  leadRecruiter: LEAD_RECRUITER_NAV,
  recruiter: RECRUITER_NAV,
}

export const getInternalNavigationByRole = (role: InternalRole): readonly InternalNavGroup[] =>
  INTERNAL_NAVIGATION_BY_ROLE[role]
