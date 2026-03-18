import type { ReactNode } from 'react'

import { InternalNavigation } from '@/components/internal/InternalNavigation'
import { requireInternalUser } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'

type InternalProtectedLayoutProps = {
  children: ReactNode
}

export default async function InternalProtectedLayout({ children }: InternalProtectedLayoutProps) {
  const user = await requireInternalUser()

  return (
    <div className="internal-shell">
      <aside className="internal-sidebar">
        <div>
          <p className="eyebrow">Recruitment Ops</p>
          <h2 className="sidebar-title">Internal Portal</h2>
        </div>
        <InternalNavigation role={user.role} />
      </aside>

      <div className="internal-main">
        <header className="internal-header">
          <div>
            <p className="muted small">Signed in as</p>
            <p className="user-email">{user.fullName || user.email}</p>
            <p className="muted tiny">{INTERNAL_ROLE_LABELS[user.role]}</p>
          </div>
          <a className="admin-link" href={APP_ROUTES.payloadAdmin} rel="noreferrer" target="_blank">
            Open Payload Admin
          </a>
        </header>

        <main className="internal-content">{children}</main>
      </div>
    </div>
  )
}
