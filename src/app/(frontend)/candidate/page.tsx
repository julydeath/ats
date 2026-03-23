import { redirect } from 'next/navigation'

import { getCurrentCandidateUser } from '@/lib/auth/candidate-auth'
import { APP_ROUTES } from '@/lib/constants/routes'

export default async function CandidateRootPage() {
  const user = await getCurrentCandidateUser()

  if (user) {
    redirect(APP_ROUTES.candidate.dashboard)
  }

  redirect(APP_ROUTES.candidate.login)
}
