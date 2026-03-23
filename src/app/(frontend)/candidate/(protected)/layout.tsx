import Link from 'next/link'
import type { ReactNode } from 'react'

import { CandidateLogoutButton } from '@/components/candidate/CandidateLogoutButton'
import { requireCandidateUser } from '@/lib/auth/candidate-auth'
import { APP_ROUTES } from '@/lib/constants/routes'

type CandidateProtectedLayoutProps = {
  children: ReactNode
}

export default async function CandidateProtectedLayout({ children }: CandidateProtectedLayoutProps) {
  const user = await requireCandidateUser()

  return (
    <div className="internal-shell">
      <aside className="internal-sidebar">
        <div>
          <p className="eyebrow">Recruitment Ops</p>
          <h2 className="sidebar-title">Candidate Portal</h2>
        </div>
        <nav aria-label="Candidate navigation" className="internal-nav">
          <ul className="nav-list">
            <li>
              <Link className="nav-link" href={APP_ROUTES.candidate.dashboard}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link className="nav-link" href={APP_ROUTES.candidate.applications}>
                Application Status
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="internal-main">
        <header className="internal-header">
          <div>
            <p className="muted small">Candidate Account</p>
            <p className="user-email">{user.fullName || user.email}</p>
            <p className="muted tiny">{user.email}</p>
          </div>
          <div className="public-actions">
            <CandidateLogoutButton />
          </div>
        </header>

        <main className="internal-content">{children}</main>
      </div>
    </div>
  )
}
