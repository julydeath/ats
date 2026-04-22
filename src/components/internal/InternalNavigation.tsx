'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { getInternalNavigationByRole } from '@/lib/constants/internal-navigation'
import type { InternalRole } from '@/lib/constants/roles'

type InternalNavigationProps = {
  role: InternalRole
}

const ICON_TEXT: Record<string, string> = {
  applications: 'A',
  analytics: 'N',
  attendance: 'T',
  assignments: 'M',
  candidates: 'C',
  clients: 'L',
  dashboard: 'D',
  interviews: 'I',
  jobs: 'J',
  leave: 'V',
  payroll: 'Y',
  placements: 'P',
  performance: 'F',
  review: 'R',
  schedule: 'S',
  settings: 'T',
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
              const isActive =
                item.href === '/internal/dashboard'
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <li key={item.href}>
                  <Link className={`nav-link ${isActive ? 'nav-link-active' : ''}`} href={item.href}>
                    <span className={`nav-icon nav-icon-${item.icon || 'dashboard'}`}>
                      {ICON_TEXT[item.icon || 'dashboard']}
                    </span>
                    <span className="nav-title">{item.label}</span>
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
