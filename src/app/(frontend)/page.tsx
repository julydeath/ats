import Link from 'next/link'

import { APP_ROUTES } from '@/lib/constants/routes'

export default function HomePage() {
  return (
    <section className="public-home">
      <div className="public-card">
        <p className="eyebrow">Realizing Dreams Inspirix HR Services</p>
        <h1>Recruitment Operations Platform</h1>
        <p className="muted">
          Phase 1 foundation is active for internal users. Candidate architecture is prepared for
          upcoming phases.
        </p>

        <div className="public-actions">
          <Link className="button" href={APP_ROUTES.internal.login}>
            Internal Login
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.payloadAdmin}>
            Payload Admin
          </Link>
        </div>
      </div>
    </section>
  )
}
