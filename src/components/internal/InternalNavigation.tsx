'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { getInternalNavigationByRole } from '@/lib/constants/internal-navigation'
import type { InternalRole } from '@/lib/constants/roles'

type InternalNavigationProps = {
  role: InternalRole
}

export const InternalNavigation = ({ role }: InternalNavigationProps) => {
  const pathname = usePathname()
  const navigationGroups = getInternalNavigationByRole(role)

  return (
    <nav aria-label="Internal navigation" className="internal-nav">
      {navigationGroups.map((group) => (
        <section className="nav-group" key={group.title}>
          <p className="nav-group-title">{group.title}</p>
          <ul className="nav-list">
            {group.items.map((item) => {
              const isActive = pathname === item.href
              const iconText = item.label
                .split(' ')
                .slice(0, 2)
                .map((part) => part[0] || '')
                .join('')
                .toUpperCase()

              return (
                <li key={item.href}>
                  <Link className={`nav-link ${isActive ? 'nav-link-active' : ''}`} href={item.href}>
                    <span className="nav-icon">{iconText}</span>
                    <span className="nav-copy">
                      <span className="nav-title">{item.label}</span>
                      <small className="nav-description">{item.description}</small>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </nav>
  )
}
