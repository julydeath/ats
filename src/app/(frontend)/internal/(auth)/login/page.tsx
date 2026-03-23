import { redirect } from 'next/navigation'

import { InternalLoginForm } from '@/components/internal/InternalLoginForm'
import { getCurrentInternalUser } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'

export default async function InternalLoginPage() {
  const user = await getCurrentInternalUser()

  if (user) {
    redirect(APP_ROUTES.internal.dashboard)
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Realizing Dreams Inspirix HR Services</p>
        <h1>Internal Recruitment Workflow</h1>
        <p className="muted">Sign in with your employee account to open your role-based workflow dashboard.</p>
        <InternalLoginForm />
      </div>
    </section>
  )
}
