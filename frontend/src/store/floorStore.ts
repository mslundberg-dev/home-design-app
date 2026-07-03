import { create } from 'zustand'
import type { FloorGeometry, Room } from '../types'

const EMPTY_GEOMETRY: FloorGeometry = {
  schema_version: 1,
  north_angle_degrees: 0,
  rooms: [],
  walls: [],
}

interface FloorState {
  geometry: FloorGeometry
  past: FloorGeometry[]
  future: FloorGeometry[]
  dirty: boolean

  loadGeometry: (geometry: FloorGeometry) => void
  addRoom: (room: Room) => void
  // Live variants apply the change without touching undo history — used for
  // continuous updates (e.g. every mousemove frame of a drag), where pushing
  // a new history entry per frame would flood `past` with hundreds of
  // near-identical snapshots and make undo revert one imperceptible frame
  // at a time instead of the whole gesture.
  updateRoomVertexLive: (roomId: string, vertexIndex: number, point: { x: number; y: number }) => void
  updateRoomEdgeVerticesLive: (
    roomId: string,
    startVertexIndex: number,
    endVertexIndex: number,
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
  ) => void
  // Call beginCheckpoint() once when a continuous interaction starts (e.g.
  // drag start) to capture the pre-interaction geometry, then
  // commitCheckpoint(that snapshot) once when it ends, so the whole
  // interaction becomes a single undo step.
  beginCheckpoint: () => FloorGeometry
  commitCheckpoint: (preInteractionGeometry: FloorGeometry) => void
  renameRoom: (roomId: string, name: string) => void
  removeRoom: (roomId: string) => void
  undo: () => void
  redo: () => void
  markSaved: () => void
}

export const useFloorStore = create<FloorState>((set, get) => {
  function commit(next: FloorGeometry) {
    const { geometry, past } = get()
    set({ geometry: next, past: [...past, geometry], future: [], dirty: true })
  }

  function applyLive(next: FloorGeometry) {
    set({ geometry: next, dirty: true })
  }

  return {
    geometry: EMPTY_GEOMETRY,
    past: [],
    future: [],
    dirty: false,

    loadGeometry: (geometry) => set({ geometry, past: [], future: [], dirty: false }),

    addRoom: (room) => {
      const { geometry } = get()
      commit({ ...geometry, rooms: [...geometry.rooms, room] })
    },

    updateRoomVertexLive: (roomId, vertexIndex, point) => {
      const { geometry } = get()
      const rooms = geometry.rooms.map((r) =>
        r.id === roomId
          ? { ...r, vertices: r.vertices.map((v, i) => (i === vertexIndex ? point : v)) }
          : r,
      )
      applyLive({ ...geometry, rooms })
    },

    updateRoomEdgeVerticesLive: (roomId, startVertexIndex, endVertexIndex, startPoint, endPoint) => {
      const { geometry } = get()
      const rooms = geometry.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              vertices: r.vertices.map((v, i) => {
                if (i === startVertexIndex) return startPoint
                if (i === endVertexIndex) return endPoint
                return v
              }),
            }
          : r,
      )
      applyLive({ ...geometry, rooms })
    },

    beginCheckpoint: () => get().geometry,

    commitCheckpoint: (preInteractionGeometry) => {
      const { past } = get()
      set({ past: [...past, preInteractionGeometry], future: [], dirty: true })
    },

    renameRoom: (roomId, name) => {
      const { geometry } = get()
      const rooms = geometry.rooms.map((r) => (r.id === roomId ? { ...r, name } : r))
      commit({ ...geometry, rooms })
    },

    removeRoom: (roomId) => {
      const { geometry } = get()
      commit({ ...geometry, rooms: geometry.rooms.filter((r) => r.id !== roomId) })
    },

    undo: () => {
      const { past, geometry, future } = get()
      if (past.length === 0) return
      const previous = past[past.length - 1]
      set({ geometry: previous, past: past.slice(0, -1), future: [geometry, ...future], dirty: true })
    },

    redo: () => {
      const { future, geometry, past } = get()
      if (future.length === 0) return
      const next = future[0]
      set({ geometry: next, future: future.slice(1), past: [...past, geometry], dirty: true })
    },

    markSaved: () => set({ dirty: false }),
  }
})
