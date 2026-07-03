import type { Floor, FloorGeometry, Project } from './types'

const BASE = '/api'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Projects ────────────────────────────────────────────────────────────────

export const listProjects = (): Promise<Project[]> =>
  request('GET', '/projects')

export const createProject = (name: string, address?: string): Promise<Project> =>
  request('POST', '/projects', { name, address: address ?? null, units_preference: 'imperial' })

export const getProject = (id: number): Promise<Project> =>
  request('GET', `/projects/${id}`)

export const deleteProject = (id: number): Promise<void> =>
  request('DELETE', `/projects/${id}`)

// ── Floors ──────────────────────────────────────────────────────────────────

export const listFloors = (projectId: number): Promise<Floor[]> =>
  request('GET', `/projects/${projectId}/floors`)

export const createFloor = (projectId: number, name: string): Promise<Floor> =>
  request('POST', `/projects/${projectId}/floors`, { name, floor_index: 0, elevation_inches: 0 })

export const getFloor = (floorId: number): Promise<Floor> =>
  request('GET', `/floors/${floorId}`)

export const saveFloorGeometry = (floorId: number, geometry: FloorGeometry): Promise<Floor> =>
  request('PUT', `/floors/${floorId}/geometry`, geometry)

export const deleteFloor = (floorId: number): Promise<void> =>
  request('DELETE', `/floors/${floorId}`)

// ── Export ───────────────────────────────────────────────────────────────────

export async function exportFloorPdf(floorId: number): Promise<void> {
  const res = await fetch(`${BASE}/floors/${floorId}/export-pdf`, { method: 'POST' })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = disposition.match(/filename="([^"]+)"/)
  a.download = match ? match[1] : `floor-${floorId}.pdf`
  a.href = url
  a.click()
  URL.revokeObjectURL(url)
}
