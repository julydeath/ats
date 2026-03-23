import Link from 'next/link'

import { APP_ROUTES } from '@/lib/constants/routes'

export default function HomePage() {
  return (
    <section className="public-home">
      <div className="public-card">
        <p className="eyebrow">Realizing Dreams Inspirix HR Services</p>
        <h1>Recruitment Operations Platform</h1>
        <p className="muted">
          Internal workflow and external candidate invite portal are active.
        </p>

        <div className="public-actions">
          <Link className="button" href={APP_ROUTES.internal.login}>
            Internal Login
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.candidate.login}>
            Candidate Login
          </Link>
          <Link className="button button-secondary" href={APP_ROUTES.payloadAdmin}>
            Payload Admin
          </Link>
        </div>
      </div>
    </section>
  )
}
