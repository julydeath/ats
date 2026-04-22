'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type InternalTopTabsProps = {
  tabs: Array<{ href: string; label: string }>
}

const isTabActive = ({ href, pathname }: { href: string; pathname: string }): boolean => {
  if (href === '/internal/dashboard') {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export const InternalTopTabs = ({ tabs }: InternalTopTabsProps) => {
  const pathname = usePathname()

  return (
    <nav aria-label="Dashboard tabs" className="ops-top-tabs">
      {tabs.map((tab) => {
        const active = isTabActive({ href: tab.href, pathname })

        return (
          <Link className={`ops-top-tab ${active ? 'ops-top-tab-active' : ''}`} href={tab.href} key={tab.label}>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
