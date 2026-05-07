'use client'

import { useState } from 'react'

import { APP_ROUTES } from '@/lib/constants/routes'

export const InternalLogoutButton = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <form action={APP_ROUTES.internal.logout} method="post" onSubmit={() => setIsSubmitting(true)}>
      <button
        className="button button-secondary logout-button"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Logging out...' : 'Logout'}
      </button>
    </form>
  )
}
