import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProject, deleteProject, listProjects } from '../api'
import type { Project } from '../types'

export function ProjectListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const project = await createProject(newName.trim(), newAddress.trim() || undefined)
      setProjects((prev) => [project, ...prev])
      setNewName('')
      setNewAddress('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return
    try {
      await deleteProject(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete project')
    }
  }

  return (
    <div className="page">
      <h1>Home Design App</h1>

      <div className="card">
        <h2>New Project</h2>
        <form className="create-form" onSubmit={handleCreate}>
          <input
            placeholder="Project name (e.g. Main House)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <input
            placeholder="Address (optional)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
          <button type="submit" disabled={creating || !newName.trim()}>
            {creating ? 'Creating…' : 'Create Project'}
          </button>
        </form>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="muted">No projects yet. Create one above.</p>
      ) : (
        <div className="project-list">
          {projects.map((p) => (
            <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)}>
              <div className="project-card-body">
                <div className="project-name">{p.name}</div>
                {p.address && <div className="project-address">{p.address}</div>}
                <div className="project-meta">
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                className="btn-danger-sm"
                onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name) }}
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
