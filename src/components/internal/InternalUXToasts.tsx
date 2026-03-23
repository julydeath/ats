'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type ToastKind = 'error' | 'info' | 'success'

type ToastItem = {
  id: string
  kind: ToastKind
  message: string
}

const fallbackMessage: Record<ToastKind, string> = {
  success: 'Action completed.',
  error: 'Something went wrong.',
  info: 'Update available.',
}

const normalizeMessage = (kind: ToastKind, value: string | null): string => {
  if (!value || value === '1' || value === 'true') {
    return fallbackMessage[kind]
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export const InternalUXToasts = () => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const nextToasts: ToastItem[] = []

    ;(['success', 'error', 'info'] as const).forEach((kind) => {
      const value = params.get(kind)
      if (!value) {
        return
      }

      nextToasts.push({
        id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind,
        message: normalizeMessage(kind, value),
      })
      params.delete(kind)
    })

    if (nextToasts.length === 0) {
      return
    }

    setToasts((prev) => [...nextToasts, ...prev].slice(0, 4))

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (toasts.length === 0) {
      return
    }

    const timeout = window.setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1))
    }, 4500)

    return () => window.clearTimeout(timeout)
  }, [toasts])

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <article className={`toast toast-${toast.kind}`} key={toast.id} role="status">
          <p>{toast.message}</p>
          <button
            aria-label="Dismiss notification"
            className="toast-close"
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
            type="button"
          >
            ×
          </button>
        </article>
      ))}
    </div>
  )
}
