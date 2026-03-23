import type { ReactNode } from 'react'

import { FormUXEnhancer } from '@/components/internal/FormUXEnhancer'
import { InternalNavigation } from '@/components/internal/InternalNavigation'
import { InternalLogoutButton } from '@/components/internal/InternalLogoutButton'
import { InternalQuickLauncher } from '@/components/internal/InternalQuickLauncher'
import { InternalUXToasts } from '@/components/internal/InternalUXToasts'
import { RoleOnboardingWalkthrough } from '@/components/internal/RoleOnboardingWalkthrough'
import { requireInternalUser } from '@/lib/auth/internal-auth'
import type { InternalRole } from '@/lib/constants/roles'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'

type InternalProtectedLayoutProps = {
  children: ReactNode
}

const ROLE_OBJECTIVE: Readonly<Record<InternalRole, string>> = {
  admin: 'Keep ownership, allocation, and review flow healthy across the full team.',
  headRecruiter: 'Own client and job distribution across leads and monitor delivery.',
  leadRecruiter: 'Balance recruiter workloads and complete internal review decisions.',
  recruiter: 'Source candidates, create applications, and submit complete profiles for review.',
}

export default async function InternalProtectedLayout({ children }: InternalProtectedLayoutProps) {
  const user = await requireInternalUser()
  const today = new Date().toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
    year: 'numeric',
  })

  return (
    <div className="internal-shell">
      <aside className="internal-sidebar">
        <div>
          <p className="eyebrow">RDI HR Services</p>
          <h2 className="sidebar-title">People Operations</h2>
          <p className="sidebar-role">{INTERNAL_ROLE_LABELS[user.role]}</p>
          <p className="sidebar-objective">{ROLE_OBJECTIVE[user.role]}</p>
        </div>
        <InternalNavigation role={user.role} />
        <InternalLogoutButton />
      </aside>

      <div className="internal-main">
        <header className="internal-header">
          <div className="header-user">
            <p className="muted small">Signed in as</p>
            <p className="user-email">{user.fullName || user.email}</p>
            <p className="muted tiny">{INTERNAL_ROLE_LABELS[user.role]}</p>
          </div>
          <div className="header-actions">
            <p className="muted small">Today: {today}</p>
            <InternalQuickLauncher role={user.role} />
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
