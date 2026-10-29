import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { BrandLogo } from '@/components/brand/BrandLogo'
import { CandidateLoginForm } from '@/components/candidate/CandidateLoginForm'
import { getCurrentCandidateUser } from '@/lib/auth/candidate-auth'
import { APP_ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = {
  description: 'Sign in to track your job application with INSPiREX HR.',
  robots: {
    follow: false,
    index: false,
  },
  title: 'Candidate portal sign in',
}

type CandidateLoginPageProps = {
  searchParams?: Promise<{
    success?: string
  }>
}

export default async function CandidateLoginPage({ searchParams }: CandidateLoginPageProps) {
  const user = await getCurrentCandidateUser()
  const resolvedSearchParams = (await searchParams) ?? {}

  if (user) {
    redirect(APP_ROUTES.candidate.dashboard)
  }

  return (
    <div className="brand-login">
      <main className="brand-login-main">
        <header className="brand-login-header">
          <BrandLogo className="brand-login-logo" height={84} priority />
          <p>Candidate Portal</p>
        </header>

        <div className="auth-card brand-card">
          <h1>Track your application</h1>
          <p className="muted">Sign in to see your application status and updates.</p>
          {resolvedSearchParams.success === 'applicationSubmitted' ? (
            <p className="brand-notice">Application submitted. Sign in to track progress.</p>
          ) : null}
          <CandidateLoginForm />
        </div>
      </main>
    </div>
  )
}
