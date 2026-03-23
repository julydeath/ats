'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { APP_ROUTES } from '@/lib/constants/routes'

export const CandidateLogoutButton = () => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogout = async () => {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      await fetch('/api/candidate-users/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      router.replace(APP_ROUTES.candidate.login)
      router.refresh()
      setIsSubmitting(false)
    }
  }

  return (
    <button className="button button-secondary" disabled={isSubmitting} onClick={handleLogout} type="button">
      {isSubmitting ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
