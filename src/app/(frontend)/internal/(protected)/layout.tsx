import type { ReactNode } from 'react'
import Link from 'next/link'

import { FormUXEnhancer } from '@/components/internal/FormUXEnhancer'
import { InternalNavigation } from '@/components/internal/InternalNavigation'
import { InternalLogoutButton } from '@/components/internal/InternalLogoutButton'
import { InternalUXToasts } from '@/components/internal/InternalUXToasts'
import { RoleOnboardingWalkthrough } from '@/components/internal/RoleOnboardingWalkthrough'
import { requireInternalUser } from '@/lib/auth/internal-auth'
import type { InternalRole } from '@/lib/constants/roles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'

type InternalProtectedLayoutProps = {
  children: ReactNode
}

const ROLE_OBJECTIVE: Readonly<Record<InternalRole, string>> = {
  admin: 'Create clients, assign leads, and keep ownership and review flow healthy.',
  leadRecruiter: 'Create jobs, assign recruiters, and complete internal review decisions.',
  recruiter: 'Source candidates, create applications, and submit complete profiles for review.',
}

const PRIMARY_ACTION: Readonly<
  Record<InternalRole, { href: string; label: string }>
> = {
  admin: {
    href: '/internal/clients',
    label: 'Create Client',
  },
  leadRecruiter: {
    href: `${APP_ROUTES.internal.jobs.assigned}#create-job`,
    label: 'Create Job',
  },
  recruiter: {
    href: '/internal/candidates/new',
    label: 'Add Candidate',
  },
}

export default async function InternalProtectedLayout({ children }: InternalProtectedLayoutProps) {
  const user = await requireInternalUser()
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
    year: 'numeric',
  })
  const action = PRIMARY_ACTION[user.role]
  const avatarText = (user.fullName || user.email || 'User')
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="internal-shell">
      <aside className="internal-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">RD</span>
          <div>
            <p className="sidebar-brand-title">Realizing Dreams</p>
            <p className="sidebar-brand-subtitle">Inspirix HR Services</p>
          </div>
        </div>
        <div>
          <p className="sidebar-role">{INTERNAL_ROLE_LABELS[user.role]}</p>
          <p className="sidebar-objective">{ROLE_OBJECTIVE[user.role]}</p>
        </div>
        <InternalNavigation role={user.role} />
        <div className="sidebar-footer">
          <Link className="button button-secondary sidebar-settings-button" href={APP_ROUTES.internal.settings}>
            Settings
          </Link>
          <InternalLogoutButton />
        </div>
      </aside>

      <div className="internal-main">
        <header className="internal-header">
          <div className="header-top-row">
            <Link className="button button-secondary header-browse-jobs" href={APP_ROUTES.internal.jobs.assigned}>
              Browse Jobs
            </Link>
            <form action={APP_ROUTES.internal.candidates.list} className="header-search-form" method="get">
              <input className="input header-search-input" name="q" placeholder="Search Candidate" type="search" />
            </form>
          </div>
          <div className="header-main-row">
            <div className="header-user">
              <p className="muted small">Welcome back</p>
              <p className="user-email">{user.fullName || user.email}</p>
              <p className="muted tiny">{INTERNAL_ROLE_LABELS[user.role]} · {today}</p>
            </div>
            <div className="header-actions">
              <Link className="button header-cta" href={action.href}>
                {action.label}
              </Link>
              <div className="header-notification" title="Notifications">
                <span className="header-notification-dot" />
              </div>
              <div className="header-profile">
                <div className="header-avatar" title={user.fullName || user.email}>
                  {avatarText}
                </div>
                <div className="header-profile-copy">
                  <p className="header-profile-name">{user.fullName || user.email}</p>
                  <p className="header-profile-role">{INTERNAL_ROLE_LABELS[user.role]}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="internal-content">{children}</main>
      </div>
      <InternalUXToasts />
      <RoleOnboardingWalkthrough role={user.role} roleLabel={INTERNAL_ROLE_LABELS[user.role]} />
      <FormUXEnhancer />
    </div>
  )
}
