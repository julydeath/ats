import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { InternalLoginForm } from '@/components/internal/InternalLoginForm'
import { getCurrentInternalUser } from '@/lib/auth/internal-auth'
import { APP_ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = {
  description: 'Sign in to the internal talent operations workspace.',
  robots: {
    follow: false,
    index: false,
  },
  title: 'Team sign in',
}

export default async function InternalLoginPage() {
  const user = await getCurrentInternalUser()

  if (user) {
    redirect(APP_ROUTES.internal.dashboard)
  }

  return (
    <div className="brand-login">
      <main className="brand-login-main">
        <header className="brand-login-header">
          <BrandLogo className="brand-login-logo" height={84} priority />
          <p>Internal Talent Operations Portal</p>
        </header>

        <InternalLoginForm />
      </main>
    </div>
  )
}
