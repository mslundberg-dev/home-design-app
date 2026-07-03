import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createFloor, deleteFloor, getProject, listFloors } from '../api'
import type { Floor, Project } from '../types'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const id = Number(projectId)

  const [project, setProject] = useState<Project | null>(null)
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newFloorName, setNewFloorName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([getProject(id), listFloors(id)])
      .then(([proj, fl]) => { setProject(proj); setFloors(fl) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleCreateFloor(e: React.FormEvent) {
    e.preventDefault()
    if (!newFloorName.trim()) return
    setCreating(true)
    try {
      const floor = await createFloor(id, newFloorName.trim())
      setFloors((prev) => [...prev, floor])
      setNewFloorName('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create floor')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteFloor(floorId: number, name: string) {
    if (!confirm(`Delete floor "${name}"? This cannot be undone.`)) return
    try {
      await deleteFloor(floorId)
      setFloors((prev) => prev.filter((f) => f.id !== floorId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete floor')
    }
  }

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>
  if (!project) return <div className="page"><p className="muted">Project not found.</p></div>

  return (
    <div className="page">
      <div className="page-nav">
        <button className="btn-back" onClick={() => navigate('/')}>← Projects</button>
      </div>
      <h1>{project.name}</h1>
      {project.address && <p className="project-address">{project.address}</p>}

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>New Floor</h2>
        <form className="create-form" onSubmit={handleCreateFloor}>
          <input
            placeholder="Floor name (e.g. Ground Floor)"
            value={newFloorName}
            onChange={(e) => setNewFloorName(e.target.value)}
            required
          />
          <button type="submit" disabled={creating || !newFloorName.trim()}>
            {creating ? 'Creating…' : 'Add Floor'}
          </button>
        </form>
      </div>

      {floors.length === 0 ? (
        <p className="muted">No floors yet. Add one above.</p>
      ) : (
        <div className="project-list">
          {floors.map((f) => (
            <div key={f.id} className="project-card" onClick={() => navigate(`/floors/${f.id}`)}>
              <div className="project-card-body">
                <div className="project-name">{f.name}</div>
                <div className="project-meta">
                  {f.geometry.rooms.length} room{f.geometry.rooms.length !== 1 ? 's' : ''}
                  {f.geometry.walls.length > 0 && `, ${f.geometry.walls.length} wall${f.geometry.walls.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <button
                className="btn-danger-sm"
                onClick={(e) => { e.stopPropagation(); handleDeleteFloor(f.id, f.name) }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
