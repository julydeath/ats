import { APP_ROUTES } from '@/lib/constants/routes'
import type { InternalRole } from '@/lib/constants/roles'
import { INTERNAL_ROLES } from '@/lib/constants/roles'

export type InternalNavItem = {
  allowedRoles: readonly InternalRole[]
  enabled: boolean
  href: string
  label: string
}

const ALL_INTERNAL_ROLES = INTERNAL_ROLES

export const INTERNAL_NAV_ITEMS: readonly InternalNavItem[] = [
  {
    label: 'Dashboard',
    href: APP_ROUTES.internal.dashboard,
    allowedRoles: ALL_INTERNAL_ROLES,
    enabled: true,
  },
  {
    label: 'Requirement Inbox',
    href: '#',
    allowedRoles: ['admin', 'headRecruiter'],
    enabled: false,
  },
  {
    label: 'Lead Assignments',
    href: APP_ROUTES.internal.assignments.head,
    allowedRoles: ['admin', 'headRecruiter'],
    enabled: true,
  },
  {
    label: 'Recruiter Assignments',
    href: APP_ROUTES.internal.assignments.lead,
    allowedRoles: ['admin', 'headRecruiter', 'leadRecruiter'],
    enabled: true,
  },
  {
    label: 'Candidate Review',
    href: '#',
    allowedRoles: ['admin', 'headRecruiter', 'leadRecruiter'],
    enabled: false,
  },
  {
    label: 'Assigned Jobs',
    href: APP_ROUTES.internal.jobs.assigned,
    allowedRoles: ['admin', 'headRecruiter', 'leadRecruiter', 'recruiter'],
    enabled: true,
  },
  {
    label: 'Attendance',
    href: '#',
    allowedRoles: ALL_INTERNAL_ROLES,
    enabled: false,
  },
  {
    label: 'Payroll',
    href: '#',
    allowedRoles: ['admin', 'headRecruiter'],
    enabled: false,
  },
] as const

export const getInternalNavigationByRole = (role: InternalRole): InternalNavItem[] =>
  INTERNAL_NAV_ITEMS.filter((item) => item.allowedRoles.includes(role))
