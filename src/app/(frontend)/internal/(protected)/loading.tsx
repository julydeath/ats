export default function InternalProtectedLoading() {
  return (
    <div className="ops-route-skeleton" aria-hidden="true">
      <div className="ops-route-skeleton-hero">
        <span className="ops-route-skeleton-kicker" />
        <span className="ops-route-skeleton-title" />
        <span className="ops-route-skeleton-copy" />
      </div>

      <div className="ops-route-skeleton-grid">
        <div className="ops-route-skeleton-card" />
        <div className="ops-route-skeleton-card" />
        <div className="ops-route-skeleton-card" />
      </div>

      <div className="ops-route-skeleton-panels">
        <div className="ops-route-skeleton-panel ops-route-skeleton-panel-wide" />
        <div className="ops-route-skeleton-panel" />
      </div>
    </div>
  )
}
