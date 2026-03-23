import { redirect } from 'next/navigation'

import { CandidateLoginForm } from '@/components/candidate/CandidateLoginForm'
import { getCurrentCandidateUser } from '@/lib/auth/candidate-auth'
import { APP_ROUTES } from '@/lib/constants/routes'

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
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Realizing Dreams Inspirix HR Services</p>
        <h1>Candidate Portal</h1>
        <p className="muted">Sign in to monitor your application status and updates.</p>
        {resolvedSearchParams.success === 'applicationSubmitted' ? (
          <p className="muted small">Application submitted successfully. Sign in to track progress.</p>
        ) : null}
        <CandidateLoginForm />
      </div>
    </section>
  )
}
