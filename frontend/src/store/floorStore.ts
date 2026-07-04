import { create } from 'zustand'
import type { FloorGeometry, Furniture, Opening, Point, Room, Wall } from '../types'

export type OpeningTarget =
  | { roomId: string; edgeId: string }
  | { wallId: string }

const EMPTY_GEOMETRY: FloorGeometry = {
  schema_version: 1,
  north_angle_degrees: 0,
  rooms: [],
  walls: [],
  furniture: [],
}

interface FloorState {
  geometry: FloorGeometry
  past: FloorGeometry[]
  future: FloorGeometry[]
  dirty: boolean

  loadGeometry: (geometry: FloorGeometry) => void

  // Rooms
  addRoom: (room: Room) => void
  updateRoomVertexLive: (roomId: string, vertexIndex: number, point: Point) => void
  updateRoomEdgeVerticesLive: (
    roomId: string,
    startVertexIndex: number,
    endVertexIndex: number,
    startPoint: Point,
    endPoint: Point,
  ) => void
  renameRoom: (roomId: string, name: string) => void
  removeRoom: (roomId: string) => void

  // Freestanding walls
  addWall: (wall: Wall) => void
  removeWall: (wallId: string) => void
  updateWallVertexLive: (wallId: string, which: 'start' | 'end', point: Point) => void
  updateWallEndpointsLive: (wallId: string, start: Point, end: Point) => void

  // Wall length editing (keeps start/v1 fixed, moves end/v2 along wall direction)
  setRoomEdgeLength: (roomId: string, edgeId: string, lengthInches: number) => void
  setWallLength: (wallId: string, lengthInches: number) => void

  // Wall height editing
  setRoomEdgeHeight: (roomId: string, edgeId: string, heightInches: number) => void
  setWallHeight: (wallId: string, heightInches: number) => void

  // Openings (on room edges or freestanding walls)
  addOpening: (target: OpeningTarget, opening: Opening) => void
  removeOpening: (target: OpeningTarget, openingId: string) => void
  updateOpening: (target: OpeningTarget, opening: Opening) => void

  // Furniture
  addFurniture: (item: Furniture) => void
  removeFurniture: (id: string) => void
  updateFurniture: (item: Furniture) => void
  moveFurnitureLive: (id: string, x: number, y: number) => void
  updateFurnitureLive: (item: Furniture) => void

  // Undo / redo
  beginCheckpoint: () => FloorGeometry
  commitCheckpoint: (preInteractionGeometry: FloorGeometry) => void
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

    // -----------------------------------------------------------------------
    // Rooms
    // -----------------------------------------------------------------------

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

    renameRoom: (roomId, name) => {
      const { geometry } = get()
      const rooms = geometry.rooms.map((r) => (r.id === roomId ? { ...r, name } : r))
      commit({ ...geometry, rooms })
    },

    removeRoom: (roomId) => {
      const { geometry } = get()
      commit({ ...geometry, rooms: geometry.rooms.filter((r) => r.id !== roomId) })
    },

    // -----------------------------------------------------------------------
    // Freestanding walls
    // -----------------------------------------------------------------------

    addWall: (wall) => {
      const { geometry } = get()
      commit({ ...geometry, walls: [...geometry.walls, wall] })
    },

    removeWall: (wallId) => {
      const { geometry } = get()
      commit({ ...geometry, walls: geometry.walls.filter((w) => w.id !== wallId) })
    },

    updateWallVertexLive: (wallId, which, point) => {
      const { geometry } = get()
      const walls = geometry.walls.map((w) =>
        w.id === wallId ? { ...w, [which]: point } : w,
      )
      applyLive({ ...geometry, walls })
    },

    updateWallEndpointsLive: (wallId, start, end) => {
      const { geometry } = get()
      const walls = geometry.walls.map((w) =>
        w.id === wallId ? { ...w, start, end } : w,
      )
      applyLive({ ...geometry, walls })
    },

    // -----------------------------------------------------------------------
    // Wall length editing
    // -----------------------------------------------------------------------

    setRoomEdgeLength: (roomId, edgeId, lengthInches) => {
      const { geometry } = get()
      const room = geometry.rooms.find((r) => r.id === roomId)
      if (!room) return
      const edge = room.edges.find((e) => e.id === edgeId)
      if (!edge) return
      const v1 = room.vertices[edge.start_vertex_index]
      const v2 = room.vertices[edge.end_vertex_index]
      const dx = v2.x - v1.x
      const dy = v2.y - v1.y
      const len = Math.hypot(dx, dy)
      if (len < 0.001) return
      const ux = dx / len
      const uy = dy / len
      const newV2 = { x: v1.x + ux * lengthInches, y: v1.y + uy * lengthInches }
      const rooms = geometry.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              vertices: r.vertices.map((v, i) =>
                i === edge.end_vertex_index ? newV2 : v,
              ),
            },
      )
      commit({ ...geometry, rooms })
    },

    setWallLength: (wallId, lengthInches) => {
      const { geometry } = get()
      const wall = geometry.walls.find((w) => w.id === wallId)
      if (!wall) return
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const len = Math.hypot(dx, dy)
      if (len < 0.001) return
      const ux = dx / len
      const uy = dy / len
      const newEnd = { x: wall.start.x + ux * lengthInches, y: wall.start.y + uy * lengthInches }
      const walls = geometry.walls.map((w) =>
        w.id === wallId ? { ...w, end: newEnd } : w,
      )
      commit({ ...geometry, walls })
    },

    setRoomEdgeHeight: (roomId, edgeId, heightInches) => {
      const { geometry } = get()
      const rooms = geometry.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              edges: r.edges.map((e) =>
                e.id === edgeId ? { ...e, height_inches: heightInches } : e,
              ),
            },
      )
      commit({ ...geometry, rooms })
    },

    setWallHeight: (wallId, heightInches) => {
      const { geometry } = get()
      const walls = geometry.walls.map((w) =>
        w.id === wallId ? { ...w, height_inches: heightInches } : w,
      )
      commit({ ...geometry, walls })
    },

    // -----------------------------------------------------------------------
    // Openings
    // -----------------------------------------------------------------------

    addOpening: (target, opening) => {
      const { geometry } = get()
      if ('roomId' in target) {
        const rooms = geometry.rooms.map((r) => {
          if (r.id !== target.roomId) return r
          const edges = r.edges.map((e) =>
            e.id === target.edgeId ? { ...e, openings: [...e.openings, opening] } : e,
          )
          return { ...r, edges }
        })
        commit({ ...geometry, rooms })
      } else {
        const walls = geometry.walls.map((w) =>
          w.id === target.wallId ? { ...w, openings: [...w.openings, opening] } : w,
        )
        commit({ ...geometry, walls })
      }
    },

    removeOpening: (target, openingId) => {
      const { geometry } = get()
      if ('roomId' in target) {
        const rooms = geometry.rooms.map((r) => {
          if (r.id !== target.roomId) return r
          const edges = r.edges.map((e) =>
            e.id === target.edgeId
              ? { ...e, openings: e.openings.filter((o) => o.id !== openingId) }
              : e,
          )
          return { ...r, edges }
        })
        commit({ ...geometry, rooms })
      } else {
        const walls = geometry.walls.map((w) =>
          w.id === target.wallId
            ? { ...w, openings: w.openings.filter((o) => o.id !== openingId) }
            : w,
        )
        commit({ ...geometry, walls })
      }
    },

    updateOpening: (target, opening) => {
      const { geometry } = get()
      if ('roomId' in target) {
        const rooms = geometry.rooms.map((r) => {
          if (r.id !== target.roomId) return r
          const edges = r.edges.map((e) =>
            e.id === target.edgeId
              ? { ...e, openings: e.openings.map((o) => (o.id === opening.id ? opening : o)) }
              : e,
          )
          return { ...r, edges }
        })
        commit({ ...geometry, rooms })
      } else {
        const walls = geometry.walls.map((w) =>
          w.id === target.wallId
            ? { ...w, openings: w.openings.map((o) => (o.id === opening.id ? opening : o)) }
            : w,
        )
        commit({ ...geometry, walls })
      }
    },

    // -----------------------------------------------------------------------
    // Furniture
    // -----------------------------------------------------------------------

    addFurniture: (item) => {
      const { geometry } = get()
      commit({ ...geometry, furniture: [...(geometry.furniture ?? []), item] })
    },

    removeFurniture: (id) => {
      const { geometry } = get()
      commit({ ...geometry, furniture: (geometry.furniture ?? []).filter((f) => f.id !== id) })
    },

    updateFurniture: (item) => {
      const { geometry } = get()
      commit({ ...geometry, furniture: (geometry.furniture ?? []).map((f) => f.id === item.id ? item : f) })
    },

    moveFurnitureLive: (id, x, y) => {
      const { geometry } = get()
      applyLive({ ...geometry, furniture: (geometry.furniture ?? []).map((f) => f.id === id ? { ...f, x, y } : f) })
    },

    updateFurnitureLive: (item) => {
      const { geometry } = get()
      applyLive({ ...geometry, furniture: (geometry.furniture ?? []).map((f) => f.id === item.id ? item : f) })
    },

    // -----------------------------------------------------------------------
    // Undo / redo
    // -----------------------------------------------------------------------

    beginCheckpoint: () => get().geometry,

    commitCheckpoint: (preInteractionGeometry) => {
      const { past } = get()
      set({ past: [...past, preInteractionGeometry], future: [], dirty: true })
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
