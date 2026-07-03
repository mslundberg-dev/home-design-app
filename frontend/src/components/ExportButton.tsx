import { useState } from 'react'
import { exportFloorPdf } from '../api'

interface ExportButtonProps {
  floorId: number
}

export function ExportButton({ floorId }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      await exportFloorPdf(floorId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <span className="export-btn-wrap">
      <button className="btn-export" onClick={handleExport} disabled={exporting} title="Export floor plan as PDF">
        {exporting ? 'Exporting…' : 'Export PDF'}
      </button>
      {error && <span className="save-error">{error}</span>}
    </span>
  )
}
