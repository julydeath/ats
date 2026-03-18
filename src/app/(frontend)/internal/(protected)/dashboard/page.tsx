import { requireInternalUser } from '@/lib/auth/internal-auth'
import { CANDIDATE_AUTH_PLAN } from '@/lib/auth/candidate-auth-plan'
import { INTERNAL_ROLE_LABELS } from '@/lib/constants/roles'

export default async function InternalDashboardPage() {
  const user = await requireInternalUser()

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Operations Dashboard</h1>
        <p className="muted">
          Welcome back. You are signed in as <strong>{INTERNAL_ROLE_LABELS[user.role]}</strong>.
        </p>
      </article>

      <article className="panel">
        <h2>Phase 1 Scope</h2>
        <ul>
          <li>Internal authentication architecture is active.</li>
          <li>Role-aware navigation skeleton is in place.</li>
          <li>Clients, jobs, and applications are intentionally deferred.</li>
        </ul>
      </article>

      <article className="panel">
        <h2>Candidate Auth Prepared</h2>
        <p className="muted">
          External role reserved as <strong>{CANDIDATE_AUTH_PLAN.role}</strong> with invite-first
          lifecycle design for later phases.
        </p>
      </article>
    </section>
  )
}
