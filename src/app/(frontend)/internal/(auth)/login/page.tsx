import { redirect } from 'next/navigation'

import { InternalLoginForm } from '@/components/internal/InternalLoginForm'
import { getCurrentInternalUser } from '@/lib/auth/internal-auth'
import { BRAND } from '@/lib/constants/brand'
import { APP_ROUTES } from '@/lib/constants/routes'

export default async function InternalLoginPage() {
  const user = await getCurrentInternalUser()

  if (user) {
    redirect(APP_ROUTES.internal.dashboard)
  }

  return (
    <section className="internal-login-page">
      <div className="internal-login-shell">
        <div className="internal-login-panel">
          <div className="internal-login-center">
            <header className="internal-login-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`${BRAND.name} logo`} className="internal-login-logo" src={BRAND.logoSrc} />
              <h1>{BRAND.name} HR</h1>
              <p>Internal Talent Operations Portal</p>
            </header>

            <InternalLoginForm />
          </div>
        </div>
      </div>
    </section>
  )
}
