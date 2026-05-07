'use client'

import { useState } from 'react'

import { APP_ROUTES } from '@/lib/constants/routes'

export const CandidateLogoutButton = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <form action={APP_ROUTES.candidate.logout} method="post" onSubmit={() => setIsSubmitting(true)}>
      <button className="button button-secondary" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Signing out...' : 'Sign out'}
      </button>
    </form>
  )
}
