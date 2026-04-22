import Link from 'next/link'

import { requireInternalRole } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'

export default async function InternalSettingsPage() {
  const user = await requireInternalRole(['admin', 'leadRecruiter', 'recruiter'])

  return (
    <section className="dashboard-grid">
      <article className="panel panel-span-2">
        <p className="eyebrow">Settings</p>
        <h1>Workspace Preferences</h1>
        <p className="panel-intro">
          Use this area to review your profile details and open the modules you use most often.
        </p>
      </article>

      <article className="panel">
        <h2>Profile</h2>
        <div className="focus-cards">
          <article className="focus-card">
            <p className="focus-title">{user.fullName || 'Internal User'}</p>
            <p className="focus-meta">{user.email}</p>
            <p className="focus-meta">Role: {INTERNAL_ROLE_LABELS[user.role]}</p>
          </article>
        </div>
      </article>

      <article className="panel">
        <h2>Quick Links</h2>
        <div className="public-actions">
          <Link className="button button-secondary" href={APP_ROUTES.internal.dashboard}>
            Dashboard
          </Link>
          {(user.role === 'admin' || user.role === 'leadRecruiter') ? (
            <Link className="button button-secondary" href={APP_ROUTES.internal.team.base}>
              Team Management
            </Link>
          ) : null}
          <Link className="button button-secondary" href={APP_ROUTES.internal.jobs.assigned}>
            Jobs
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.internal.candidates.list}>
            Candidates
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.internal.schedule}>
            Schedule
          </Link>
        </div>
      </article>
    </section>
  )
}
