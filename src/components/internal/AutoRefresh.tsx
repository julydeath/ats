'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Re-renders the current server page on an interval while `active` is true,
// e.g. while background resume parsing is still running.
export function AutoRefresh({ active, intervalMs = 5000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return

    const timer = window.setInterval(() => router.refresh(), intervalMs)
    return () => window.clearInterval(timer)
  }, [active, intervalMs, router])

  return null
}
