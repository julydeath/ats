import { APP_ROUTES } from '@/lib/constants/routes'
import type { InternalRole } from '@/lib/constants/roles'

export type InternalNavItem = {
  description: string
  href: string
  icon?:
    | 'applications'
    | 'analytics'
    | 'attendance'
    | 'assignments'
    | 'candidates'
    | 'clients'
    | 'dashboard'
    | 'interviews'
    | 'jobs'
    | 'leave'
    | 'payroll'
    | 'placements'
    | 'performance'
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
        label: 'HR Analytics',
        href: APP_ROUTES.internal.hr.analytics,
        description: 'Org-wide attendance, performance, leave, and payroll insights.',
        icon: 'analytics',
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
        label: 'Applications',
        href: APP_ROUTES.internal.applications.list,
        description: 'Track stage pipeline and candidate progress.',
        icon: 'applications',
      },
      {
        label: 'Interviews',
        href: APP_ROUTES.internal.interviews.list,
        description: 'Schedule and monitor interview rounds.',
        icon: 'interviews',
      },
      {
        label: 'Schedule',
        href: APP_ROUTES.internal.schedule,
        description: 'Calendar view for interviews and recruiter workload.',
        icon: 'schedule',
      },
      {
        label: 'Placements',
        href: APP_ROUTES.internal.placements.list,
        description: 'Track confirmations, joins, and placement outcomes.',
        icon: 'placements',
      },
      {
        label: 'Team',
        href: APP_ROUTES.internal.team.base,
        description: 'Create internal users, onboarding profiles, and salary setup.',
        icon: 'assignments',
      },
      {
        label: 'Attendance',
        href: APP_ROUTES.internal.hr.attendance,
        description: 'Track daily punch-in and punch-out logs.',
        icon: 'attendance',
      },
      {
        label: 'Leave',
        href: APP_ROUTES.internal.hr.leave,
        description: 'Review and approve employee leave requests.',
        icon: 'leave',
      },
      {
        label: 'Performance',
        href: APP_ROUTES.internal.hr.performance,
        description: 'Monitor monthly KPI and manager reviews.',
        icon: 'performance',
      },
      {
        label: 'Payroll',
        href: APP_ROUTES.internal.hr.payroll,
        description: 'Run monthly payroll and disburse via RazorpayX.',
        icon: 'payroll',
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
        label: 'Clients',
        href: APP_ROUTES.internal.clients.list,
        description: 'View all client profiles and ownership details.',
        icon: 'clients',
      },
      {
        label: 'Jobs',
        href: APP_ROUTES.internal.jobs.assigned,
        description: 'Track assigned jobs and priorities.',
        icon: 'jobs',
      },
      {
        label: 'Candidates',
        href: APP_ROUTES.internal.candidates.list,
        description: 'View and manage sourced candidate records.',
        icon: 'candidates',
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
      {
        label: 'Schedule',
        href: APP_ROUTES.internal.schedule,
        description: 'Calendar view for interviews and team commitments.',
        icon: 'schedule',
      },
      {
        label: 'Interviews',
        href: APP_ROUTES.internal.interviews.list,
        description: 'Manage interview schedule for active pipeline.',
        icon: 'interviews',
      },
      {
        label: 'Placements',
        href: APP_ROUTES.internal.placements.list,
        description: 'Track candidates moving into placement lifecycle.',
        icon: 'placements',
      },
      {
        label: 'Attendance',
        href: APP_ROUTES.internal.hr.attendance,
        description: 'View attendance and punch records.',
        icon: 'attendance',
      },
      {
        label: 'Leave',
        href: APP_ROUTES.internal.hr.leave,
        description: 'Review recruiter leave requests and status.',
        icon: 'leave',
      },
      {
        label: 'Performance',
        href: APP_ROUTES.internal.hr.performance,
        description: 'Track team KPI snapshots and manager reviews.',
        icon: 'performance',
      },
      {
        label: 'Team',
        href: APP_ROUTES.internal.team.base,
        description: 'Add recruiters and maintain onboarding profiles.',
        icon: 'assignments',
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
        label: 'Clients',
        href: APP_ROUTES.internal.clients.list,
        description: 'View all client accounts and context.',
        icon: 'clients',
      },
      {
        label: 'Jobs',
        href: APP_ROUTES.internal.jobs.assigned,
        description: 'View all jobs across the workspace.',
        icon: 'jobs',
      },
      {
        label: 'Candidates',
        href: APP_ROUTES.internal.candidates.list,
        description: 'Create and update candidate profiles.',
        icon: 'candidates',
      },
      {
        label: 'Applications',
        href: APP_ROUTES.internal.applications.list,
        description: 'View application pipeline status.',
        icon: 'applications',
      },
      {
        label: 'Schedule',
        href: APP_ROUTES.internal.schedule,
        description: 'Track interview calendar and upcoming sessions.',
        icon: 'schedule',
      },
      {
        label: 'Interviews',
        href: APP_ROUTES.internal.interviews.list,
        description: 'View interview schedules and upcoming sessions.',
        icon: 'interviews',
      },
      {
        label: 'Placements',
        href: APP_ROUTES.internal.placements.list,
        description: 'View placement status across assigned applications.',
        icon: 'placements',
      },
      {
        label: 'Attendance',
        href: APP_ROUTES.internal.hr.attendance,
        description: 'Punch in/out and check daily attendance.',
        icon: 'attendance',
      },
      {
        label: 'Leave',
        href: APP_ROUTES.internal.hr.leave,
        description: 'Apply leave and monitor approval status.',
        icon: 'leave',
      },
      {
        label: 'Performance',
        href: APP_ROUTES.internal.hr.performance,
        description: 'View monthly KPI and manager review scores.',
        icon: 'performance',
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
