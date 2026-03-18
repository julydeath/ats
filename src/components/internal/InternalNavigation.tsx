import Link from 'next/link'

import { getInternalNavigationByRole } from '@/lib/constants/internal-navigation'
import type { InternalRole } from '@/lib/constants/roles'

type InternalNavigationProps = {
  role: InternalRole
}

export const InternalNavigation = ({ role }: InternalNavigationProps) => {
  const navigationItems = getInternalNavigationByRole(role)

  return (
    <nav aria-label="Internal navigation" className="internal-nav">
      <ul className="nav-list">
        {navigationItems.map((item) => (
          <li key={item.label}>
            {item.enabled ? (
              <Link className="nav-link" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className="nav-link nav-link-disabled" title="Planned in upcoming phase">
                {item.label}
                <small className="nav-soon">Soon</small>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
