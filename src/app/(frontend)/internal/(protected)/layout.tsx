import type { ReactNode } from 'react'
import Link from 'next/link'

import { FormUXEnhancer } from '@/components/internal/FormUXEnhancer'
import { InternalNavigation } from '@/components/internal/InternalNavigation'
import { InternalLogoutButton } from '@/components/internal/InternalLogoutButton'
import { InternalUXToasts } from '@/components/internal/InternalUXToasts'
import { requireInternalUser } from '@/lib/auth/internal-auth'
import type { InternalRole } from '@/lib/constants/roles'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'

type InternalProtectedLayoutProps = {
  children: ReactNode
}

const ROLE_BADGE_LABEL: Readonly<Record<InternalRole, string>> = {
  admin: 'ADMIN',
  leadRecruiter: 'LEAD RECRUITER',
  recruiter: 'RECRUITER',
}

const TOP_TABS: Readonly<Record<InternalRole, Array<{ href: string; label: string }>>> = {
  admin: [
    { href: APP_ROUTES.internal.dashboard, label: 'Dashboard' },
    { href: APP_ROUTES.internal.jobs.assigned, label: 'Analytics' },
    { href: APP_ROUTES.internal.candidates.list, label: 'Directory' },
  ],
  leadRecruiter: [],
  recruiter: [],
}

export default async function InternalProtectedLayout({ children }: InternalProtectedLayoutProps) {
  const user = await requireInternalUser()

  const topTabs = TOP_TABS[user.role]
  const avatarText = (user.fullName || user.email || 'User')
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="ops-shell">
      <header className="ops-topbar">
        <div className="ops-topbar-left">
          <Link className="ops-topbar-brand" href={APP_ROUTES.internal.dashboard}>
            Inspirix HR
          </Link>
          <span className="ops-role-badge">{ROLE_BADGE_LABEL[user.role]}</span>
        </div>

        {topTabs.length > 0 ? (
          <nav aria-label="Dashboard tabs" className="ops-top-tabs">
            {topTabs.map((tab, index) => (
              <Link className={`ops-top-tab ${index === 0 ? 'ops-top-tab-active' : ''}`} href={tab.href} key={tab.label}>
                {tab.label}
              </Link>
            ))}
          </nav>
        ) : (
          <div />
        )}

        <div className="ops-topbar-right">
          <span className="ops-top-icon" title="Notifications">
            ●
          </span>
          <span className="ops-top-icon" title="Apps">
            ◼
          </span>
          <div className="ops-user-pill">
            <span className="ops-user-avatar">{avatarText}</span>
            <div className="ops-user-copy">
              <p className="ops-user-name">{user.fullName || user.email}</p>
              <p className="ops-user-role">{INTERNAL_ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="ops-body">
        <aside className="ops-sidebar">
          <div className="ops-side-brand">
            <span className="ops-side-brand-mark">■</span>
            <div>
              <p className="ops-side-brand-title">Inspirix HR</p>
              <p className="ops-side-brand-subtitle">Recruitment Ops</p>
            </div>
          </div>

          <Link className="ops-post-job-button" href={`${APP_ROUTES.internal.jobs.assigned}#create-job`}>
            + Post New Job
          </Link>

          <div className="ops-sidebar-nav-wrap">
            <InternalNavigation role={user.role} />
          </div>

          <div className="ops-sidebar-footer">
            <Link className="ops-help-link" href={APP_ROUTES.root}>
              Help Center
            </Link>
            <InternalLogoutButton />
          </div>
        </aside>

        <main className="ops-content">{children}</main>
      </div>

      <InternalUXToasts />
      <FormUXEnhancer />
    </div>
  )
}
