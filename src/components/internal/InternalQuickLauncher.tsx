'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useMemo, useState } from 'react'

import { getInternalNavigationByRole } from '@/lib/constants/internal-navigation'
import type { InternalRole } from '@/lib/constants/roles'

type InternalQuickLauncherProps = {
  role: InternalRole
}

type LauncherItem = {
  description: string
  group: string
  href: string
  key: string
  label: string
}

export const InternalQuickLauncher = ({ role }: InternalQuickLauncherProps) => {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const items = useMemo<LauncherItem[]>(
    () =>
      getInternalNavigationByRole(role).flatMap((group) =>
        group.items.map((item) => ({
          description: item.description,
          group: group.title,
          href: item.href,
          key: `${group.title}::${item.label}`,
          label: item.label,
        })),
      ),
    [role],
  )

  const matchedItems = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) {
      return items.slice(0, 8)
    }

    return items
      .filter((item) => {
        const haystack = `${item.label} ${item.group} ${item.description}`.toLowerCase()
        return haystack.includes(normalized)
      })
      .slice(0, 8)
  }, [items, query])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalized = query.trim().toLowerCase()

    if (!normalized) {
      return
    }

    const exact = matchedItems.find((item) => item.label.toLowerCase() === normalized)
    const target = exact || matchedItems[0]

    if (!target) {
      return
    }

    router.push(target.href)
    setQuery('')
  }

  return (
    <div className="quick-launcher">
      <form className="quick-launcher-form" onSubmit={handleSubmit}>
        <input
          className="input quick-launcher-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search modules (jobs, candidates, applications...)"
          type="search"
          value={query}
        />
        <button className="button button-secondary quick-launcher-button" type="submit">
          Open
        </button>
      </form>
      {query.trim() ? (
        <div className="quick-launcher-results">
          {matchedItems.length === 0 ? (
            <p className="muted tiny">No matching module found.</p>
          ) : (
            matchedItems.map((item) => (
              <button
                className="quick-launcher-item"
                key={item.key}
                onClick={() => router.push(item.href)}
                type="button"
              >
                <span className="quick-launcher-item-title">{item.label}</span>
                <span className="quick-launcher-item-meta">
                  {item.group} · {item.description}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
