'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import {
  INTERNAL_ROUTE_PENDING_EVENT,
  endInternalRoutePending,
} from '@/lib/ui/internal-route-feedback'

const isSameDocumentHashNavigation = (url: URL) =>
  url.pathname === window.location.pathname &&
  url.search === window.location.search &&
  url.hash.length > 0

const isSameRoute = (url: URL) =>
  url.pathname === window.location.pathname &&
  url.search === window.location.search &&
  url.hash === window.location.hash

export const InternalRouteLoadingIndicator = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    const handlePendingEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ state?: string }>
      const state = customEvent.detail?.state

      setIsPending(state === 'start')
    }

    const handleAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const target = event.target instanceof Element ? event.target : null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null

      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return
      }

      const nextURL = new URL(anchor.href, window.location.href)

      if (
        nextURL.origin !== window.location.origin ||
        isSameDocumentHashNavigation(nextURL) ||
        isSameRoute(nextURL)
      ) {
        return
      }

      setIsPending(true)
    }

    window.addEventListener(INTERNAL_ROUTE_PENDING_EVENT, handlePendingEvent as EventListener)
    document.addEventListener('click', handleAnchorClick, true)

    return () => {
      window.removeEventListener(INTERNAL_ROUTE_PENDING_EVENT, handlePendingEvent as EventListener)
      document.removeEventListener('click', handleAnchorClick, true)
    }
  }, [])

  useEffect(() => {
    if (!isPending) {
      return
    }

    endInternalRoutePending()
  }, [pathname, searchParams, isPending])

  return (
    <div
      aria-hidden="true"
      className={`ops-route-loading ${isPending ? 'ops-route-loading-active' : ''}`}
    >
      <span className="ops-route-loading-bar" />
    </div>
  )
}
