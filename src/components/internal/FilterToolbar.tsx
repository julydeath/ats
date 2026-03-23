'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'

type ToolbarOption = {
  label: string
  value: string
}

type ToolbarField = {
  key: string
  label: string
  options?: readonly ToolbarOption[]
  placeholder?: string
  type: 'search' | 'select'
}

type SavedView = {
  id: string
  name: string
  values: Record<string, string>
}

type FilterToolbarProps = {
  fields: readonly ToolbarField[]
  storageKey: string
  title: string
}

const normalizeValues = (fields: readonly ToolbarField[], params: URLSearchParams): Record<string, string> => {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = params.get(field.key) || ''
    return acc
  }, {})
}

export const FilterToolbar = ({ fields, storageKey, title }: FilterToolbarProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [values, setValues] = useState<Record<string, string>>(() =>
    normalizeValues(fields, new URLSearchParams(searchParams.toString())),
  )
  const [savedViews, setSavedViews] = useState<SavedView[]>([])

  const localStorageKey = `internal-filter-views:${storageKey}`

  const activeFilterCount = useMemo(
    () => Object.values(values).filter((value) => value.trim().length > 0).length,
    [values],
  )

  useEffect(() => {
    setValues(normalizeValues(fields, new URLSearchParams(searchParams.toString())))
  }, [fields, searchParams])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(localStorageKey)

      if (!raw) {
        setSavedViews([])
        return
      }

      const parsed = JSON.parse(raw) as SavedView[]
      if (!Array.isArray(parsed)) {
        setSavedViews([])
        return
      }

      setSavedViews(parsed)
    } catch {
      setSavedViews([])
    }
  }, [localStorageKey])

  const applyValues = (nextValues: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())

    fields.forEach((field) => {
      const nextValue = nextValues[field.key]?.trim() || ''

      if (nextValue) {
        params.set(field.key, nextValue)
      } else {
        params.delete(field.key)
      }
    })

    params.delete('page')

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleApply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    applyValues(values)
  }

  const handleClear = () => {
    const cleared = fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = ''
      return acc
    }, {})

    setValues(cleared)
    applyValues(cleared)
  }

  const handleSaveView = () => {
    const hasValues = Object.values(values).some((value) => value.trim().length > 0)
    if (!hasValues) {
      return
    }

    const name = window.prompt('Name this view')
    if (!name || !name.trim()) {
      return
    }

    const nextViews: SavedView[] = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        values,
      },
      ...savedViews,
    ].slice(0, 12)

    setSavedViews(nextViews)
    window.localStorage.setItem(localStorageKey, JSON.stringify(nextViews))
  }

  const handleDeleteView = (id: string) => {
    const nextViews = savedViews.filter((view) => view.id !== id)
    setSavedViews(nextViews)
    window.localStorage.setItem(localStorageKey, JSON.stringify(nextViews))
  }

  return (
    <section className="panel panel-span-2">
      <h2>{title}</h2>
      <form className="filter-toolbar" onSubmit={handleApply}>
        {fields.map((field) =>
          field.type === 'search' ? (
            <div className="filter-field" key={field.key}>
              <label className="form-field" htmlFor={field.key}>
                {field.label}
              </label>
              <input
                className="input"
                id={field.key}
                name={field.key}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                placeholder={field.placeholder || 'Search'}
                type="search"
                value={values[field.key] || ''}
              />
            </div>
          ) : (
            <div className="filter-field" key={field.key}>
              <label className="form-field" htmlFor={field.key}>
                {field.label}
              </label>
              <select
                className="input"
                id={field.key}
                name={field.key}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                value={values[field.key] || ''}
              >
                <option value="">All</option>
                {field.options?.map((option) => (
                  <option key={`${field.key}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ),
        )}
        <div className="filter-actions">
          <button className="button" type="submit">
            Apply Filters
          </button>
          <button className="button button-secondary" onClick={handleClear} type="button">
            Clear
          </button>
          <button className="button button-secondary" onClick={handleSaveView} type="button">
            Save View
          </button>
          <p className="muted tiny">Active filters: {activeFilterCount}</p>
        </div>
      </form>

      <div className="saved-views">
        <p className="form-field">Saved Views</p>
        {savedViews.length === 0 ? (
          <p className="muted tiny">No saved views yet.</p>
        ) : (
          <div className="saved-views-list">
            {savedViews.map((view) => (
              <div className="saved-view-item" key={view.id}>
                <button className="button button-secondary" onClick={() => applyValues(view.values)} type="button">
                  {view.name}
                </button>
                <button
                  aria-label={`Delete saved view ${view.name}`}
                  className="button button-secondary"
                  onClick={() => handleDeleteView(view.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
