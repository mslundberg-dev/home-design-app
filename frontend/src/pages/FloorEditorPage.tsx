import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, useBeforeUnload, Link } from 'react-router-dom'
import { getFloor, saveFloorGeometry } from '../api'
import { FloorCanvas } from '../canvas/FloorCanvas'
import { Toolbar } from '../components/Toolbar'
import { UnitToggle } from '../components/UnitToggle'
import { PropertiesPanel } from '../components/PropertiesPanel'
import { ExportButton } from '../components/ExportButton'
import { FurniturePanel } from '../components/FurniturePanel'
import { DoorPanel, WindowPanel } from '../components/DoorWindowPanel'
import { useFloorStore } from '../store/floorStore'

export function FloorEditorPage() {
  const { floorId } = useParams<{ floorId: string }>()
  const navigate = useNavigate()
  const id = Number(floorId)

  const geometry = useFloorStore((s) => s.geometry)
  const dirty = useFloorStore((s) => s.dirty)
  const loadGeometry = useFloorStore((s) => s.loadGeometry)
  const markSaved = useFloorStore((s) => s.markSaved)

  const [floorName, setFloorName] = useState('')
  const [projectId, setProjectId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load floor geometry on mount
  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    getFloor(id)
      .then((floor) => {
        setFloorName(floor.name)
        setProjectId(floor.project_id)
        loadGeometry(floor.geometry)
        setLastSaved(new Date(floor.updated_at))
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // Warn before browser tab close when unsaved changes exist
  useBeforeUnload(
    useCallback(
      (e) => {
        if (dirty) e.preventDefault()
      },
      [dirty],
    ),
  )

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await saveFloorGeometry(id, geometry)
      markSaved()
      setLastSaved(new Date(updated.updated_at))
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return
    navigate(projectId !== null ? `/projects/${projectId}` : '/')
  }

  if (loading) return <div className="page"><p className="muted">Loading floor…</p></div>
  if (loadError) return <div className="page"><div className="error-banner">{loadError}</div></div>

  return (
    <div className="app">
      <div className="editor-topbar">
        <button className="btn-back" onClick={handleBack}>← Back</button>
        <span className="editor-floor-name">{floorName}</span>
        <div className="editor-save-group">
          {saveError && <span className="save-error">{saveError}</span>}
          {lastSaved && !dirty && (
            <span className="save-status">Saved {lastSaved.toLocaleTimeString()}</span>
          )}
          {dirty && <span className="save-status dirty">Unsaved changes</span>}
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <ExportButton floorId={id} />
          <Link className="btn-3d" to={`/floors/${id}/3d`}>View in 3D →</Link>
        </div>
      </div>

      <div className="floor-editor">
        <div className="floor-editor-header">
          <Toolbar />
          <UnitToggle />
        </div>
        <div className="floor-editor-body">
          <DoorPanel />
          <WindowPanel />
          <FurniturePanel />
          <FloorCanvas />
          <PropertiesPanel />
        </div>
      </div>
    </div>
  )
}
