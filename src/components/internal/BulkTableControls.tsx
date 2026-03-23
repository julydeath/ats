'use client'

import { useEffect, useMemo, useState } from 'react'

type BulkTableControlsProps = {
  exportFilename: string
  itemLabel: string
  tableId: string
}

const toCSV = (rows: Array<Record<string, string>>) => {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0])
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || ''
          const escaped = value.replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(','),
    ),
  ]

  return csvRows.join('\n')
}

export const BulkTableControls = ({ exportFilename, itemLabel, tableId }: BulkTableControlsProps) => {
  const [selectedRows, setSelectedRows] = useState<Array<Record<string, string>>>([])

  const selectedCount = selectedRows.length
  const pluralLabel = selectedCount === 1 ? itemLabel : `${itemLabel}s`

  useEffect(() => {
    const table = document.querySelector(`[data-bulk-table="${tableId}"]`)
    if (!table) {
      return
    }

    const checkboxes = Array.from(
      table.querySelectorAll<HTMLInputElement>('input[data-bulk-item="true"]'),
    )

    const syncSelection = () => {
      const nextRows = checkboxes
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => {
          const raw = checkbox.dataset.row || '{}'

          try {
            return JSON.parse(raw) as Record<string, string>
          } catch {
            return {}
          }
        })

      setSelectedRows(nextRows)
    }

    checkboxes.forEach((checkbox) => checkbox.addEventListener('change', syncSelection))
    syncSelection()

    return () => {
      checkboxes.forEach((checkbox) => checkbox.removeEventListener('change', syncSelection))
    }
  }, [tableId])

  const hasSelection = useMemo(() => selectedCount > 0, [selectedCount])

  const handleSelectAll = () => {
    const table = document.querySelector(`[data-bulk-table="${tableId}"]`)
    if (!table) {
      return
    }

    table.querySelectorAll<HTMLInputElement>('input[data-bulk-item="true"]').forEach((checkbox) => {
      checkbox.checked = true
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  const handleClear = () => {
    const table = document.querySelector(`[data-bulk-table="${tableId}"]`)
    if (!table) {
      return
    }

    table.querySelectorAll<HTMLInputElement>('input[data-bulk-item="true"]').forEach((checkbox) => {
      checkbox.checked = false
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  const handleCopyIDs = async () => {
    const ids = selectedRows.map((row) => row.id).filter(Boolean).join(', ')
    if (!ids) {
      return
    }

    try {
      await navigator.clipboard.writeText(ids)
      window.alert('Selected IDs copied.')
    } catch {
      window.alert('Unable to copy. Please allow clipboard access.')
    }
  }

  const handleExport = () => {
    if (!hasSelection) {
      return
    }

    const csv = toCSV(selectedRows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = exportFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bulk-controls">
      <p className="muted small">
        Selected: <strong>{selectedCount}</strong> {pluralLabel}
      </p>
      <div className="public-actions">
        <button className="button button-secondary" onClick={handleSelectAll} type="button">
          Select All On Page
        </button>
        <button className="button button-secondary" onClick={handleClear} type="button">
          Clear
        </button>
        <button className="button button-secondary" disabled={!hasSelection} onClick={handleCopyIDs} type="button">
          Copy IDs
        </button>
        <button className="button button-secondary" disabled={!hasSelection} onClick={handleExport} type="button">
          Export CSV
        </button>
      </div>
    </div>
  )
}
