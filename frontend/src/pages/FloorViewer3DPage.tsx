import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFloor } from '../api'
import { FloorViewer3D } from '../canvas/FloorViewer3D'
import type { FloorGeometry } from '../types'

export function FloorViewer3DPage() {
  const { floorId } = useParams<{ floorId: string }>()
  const navigate = useNavigate()
  const id = Number(floorId)

  const [floorName, setFloorName] = useState('')
  const [projectId, setProjectId] = useState<number | null>(null)
  const [geometry, setGeometry] = useState<FloorGeometry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFloor(id)
      .then((floor) => {
        setFloorName(floor.name)
        setProjectId(floor.project_id)
        setGeometry(floor.geometry)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="page"><p className="muted">Loading 3D view…</p></div>
  if (error) return <div className="page"><div className="error-banner">{error}</div></div>
  if (!geometry) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        background: '#16213e',
        borderBottom: '1px solid #0f3460',
        flexShrink: 0,
      }}>
        <button
          className="btn-back"
          onClick={() => navigate(`/floors/${id}`)}
          style={{ color: '#e0e0e0', borderColor: '#0f3460' }}
        >
          ← Back to Editor
        </button>
        <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{floorName} — 3D View</span>
        <span style={{ color: '#888', fontSize: 12, marginLeft: 'auto' }}>
          Drag to orbit · Scroll to zoom · Right-drag to pan
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <FloorViewer3D geometry={geometry} />
      </div>
    </div>
  )
}
