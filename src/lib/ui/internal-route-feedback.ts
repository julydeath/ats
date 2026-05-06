export const INTERNAL_ROUTE_PENDING_EVENT = 'internal-route-pending'

export const beginInternalRoutePending = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(INTERNAL_ROUTE_PENDING_EVENT, {
      detail: { state: 'start' },
    }),
  )
}

export const endInternalRoutePending = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(INTERNAL_ROUTE_PENDING_EVENT, {
      detail: { state: 'done' },
    }),
  )
}
