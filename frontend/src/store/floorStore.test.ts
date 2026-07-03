import { describe, it, expect, beforeEach } from 'vitest'
import { useFloorStore } from './floorStore'
import type { FloorGeometry, Room } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY: FloorGeometry = { schema_version: 1, north_angle_degrees: 0, rooms: [], walls: [] }

function makeRoom(id: string, name = 'Room'): Room {
  return {
    id,
    name,
    vertices: [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 144 },
      { x: 0, y: 144 },
    ],
    wall_thickness_default: 6,
    edges: [
      { id: `${id}-e0`, start_vertex_index: 0, end_vertex_index: 1, thickness: 6, wall_type: 'exterior', openings: [] },
      { id: `${id}-e1`, start_vertex_index: 1, end_vertex_index: 2, thickness: 6, wall_type: 'exterior', openings: [] },
      { id: `${id}-e2`, start_vertex_index: 2, end_vertex_index: 3, thickness: 6, wall_type: 'exterior', openings: [] },
      { id: `${id}-e3`, start_vertex_index: 3, end_vertex_index: 0, thickness: 6, wall_type: 'exterior', openings: [] },
    ],
  }
}

function store() {
  return useFloorStore.getState()
}

// Reset the singleton store before every test.
beforeEach(() => {
  store().loadGeometry(EMPTY)
})

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('starts with empty geometry', () => {
    expect(store().geometry.rooms).toHaveLength(0)
    expect(store().geometry.walls).toHaveLength(0)
  })

  it('starts with no undo/redo history', () => {
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(0)
  })

  it('starts clean (not dirty)', () => {
    expect(store().dirty).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// loadGeometry
// ---------------------------------------------------------------------------

describe('loadGeometry', () => {
  it('replaces geometry and clears undo history', () => {
    store().addRoom(makeRoom('r1'))
    const newGeometry: FloorGeometry = { ...EMPTY, north_angle_degrees: 45 }
    store().loadGeometry(newGeometry)
    expect(store().geometry.north_angle_degrees).toBe(45)
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(0)
  })

  it('clears the dirty flag', () => {
    store().addRoom(makeRoom('r1'))
    expect(store().dirty).toBe(true)
    store().loadGeometry(EMPTY)
    expect(store().dirty).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// addRoom
// ---------------------------------------------------------------------------

describe('addRoom', () => {
  it('appends the room to geometry', () => {
    store().addRoom(makeRoom('r1'))
    expect(store().geometry.rooms).toHaveLength(1)
    expect(store().geometry.rooms[0].id).toBe('r1')
  })

  it('marks the store dirty', () => {
    store().addRoom(makeRoom('r1'))
    expect(store().dirty).toBe(true)
  })

  it('pushes the pre-add geometry onto the undo stack', () => {
    store().addRoom(makeRoom('r1'))
    expect(store().past).toHaveLength(1)
    expect(store().past[0].rooms).toHaveLength(0)
  })

  it('clears the redo stack', () => {
    store().addRoom(makeRoom('r1'))
    store().undo()
    expect(store().future).toHaveLength(1)
    store().addRoom(makeRoom('r2'))
    // Adding a room after undo must clear the redo stack
    expect(store().future).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// renameRoom / removeRoom
// ---------------------------------------------------------------------------

describe('renameRoom', () => {
  it('updates the room name', () => {
    store().addRoom(makeRoom('r1', 'Kitchen'))
    store().renameRoom('r1', 'Living Room')
    expect(store().geometry.rooms[0].name).toBe('Living Room')
  })

  it('pushes an undo entry', () => {
    store().addRoom(makeRoom('r1', 'Kitchen'))
    const pastLengthBefore = store().past.length
    store().renameRoom('r1', 'Living Room')
    expect(store().past.length).toBe(pastLengthBefore + 1)
  })

  it('ignores an unknown room id', () => {
    store().addRoom(makeRoom('r1', 'Kitchen'))
    store().renameRoom('unknown', 'X')
    expect(store().geometry.rooms[0].name).toBe('Kitchen')
  })
})

describe('removeRoom', () => {
  it('removes the room', () => {
    store().addRoom(makeRoom('r1'))
    store().addRoom(makeRoom('r2'))
    store().removeRoom('r1')
    expect(store().geometry.rooms).toHaveLength(1)
    expect(store().geometry.rooms[0].id).toBe('r2')
  })

  it('pushes an undo entry', () => {
    store().addRoom(makeRoom('r1'))
    const pastLengthBefore = store().past.length
    store().removeRoom('r1')
    expect(store().past.length).toBe(pastLengthBefore + 1)
  })
})

// ---------------------------------------------------------------------------
// undo / redo
// ---------------------------------------------------------------------------

describe('undo', () => {
  it('reverts to the previous geometry', () => {
    store().addRoom(makeRoom('r1'))
    store().undo()
    expect(store().geometry.rooms).toHaveLength(0)
  })

  it('moves the current state onto the redo stack', () => {
    store().addRoom(makeRoom('r1'))
    store().undo()
    expect(store().future).toHaveLength(1)
    expect(store().future[0].rooms).toHaveLength(1)
  })

  it('does nothing when there is no history', () => {
    store().undo()
    expect(store().geometry).toEqual(EMPTY)
  })

  it('supports multiple undo steps', () => {
    store().addRoom(makeRoom('r1'))
    store().addRoom(makeRoom('r2'))
    store().undo()
    expect(store().geometry.rooms).toHaveLength(1)
    store().undo()
    expect(store().geometry.rooms).toHaveLength(0)
  })
})

describe('redo', () => {
  it('reapplies the undone action', () => {
    store().addRoom(makeRoom('r1'))
    store().undo()
    store().redo()
    expect(store().geometry.rooms).toHaveLength(1)
  })

  it('does nothing when there is nothing to redo', () => {
    store().addRoom(makeRoom('r1'))
    store().redo()  // no-op
    expect(store().geometry.rooms).toHaveLength(1)
  })

  it('supports undo then redo back to original', () => {
    store().addRoom(makeRoom('r1'))
    store().addRoom(makeRoom('r2'))
    store().undo()
    store().undo()
    store().redo()
    store().redo()
    expect(store().geometry.rooms).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Live updates (no undo history)
// ---------------------------------------------------------------------------

describe('updateRoomVertexLive', () => {
  it('updates a vertex position', () => {
    store().addRoom(makeRoom('r1'))
    const pastBefore = store().past.length
    store().updateRoomVertexLive('r1', 0, { x: 10, y: 10 })
    expect(store().geometry.rooms[0].vertices[0]).toEqual({ x: 10, y: 10 })
    // Live update must NOT push to undo history
    expect(store().past.length).toBe(pastBefore)
  })

  it('leaves other vertices unchanged', () => {
    store().addRoom(makeRoom('r1'))
    store().updateRoomVertexLive('r1', 0, { x: 5, y: 5 })
    expect(store().geometry.rooms[0].vertices[1]).toEqual({ x: 120, y: 0 })
  })
})

describe('updateRoomEdgeVerticesLive', () => {
  it('updates both edge endpoints', () => {
    store().addRoom(makeRoom('r1'))
    const pastBefore = store().past.length
    store().updateRoomEdgeVerticesLive('r1', 0, 1, { x: 5, y: 0 }, { x: 125, y: 0 })
    const { vertices } = store().geometry.rooms[0]
    expect(vertices[0]).toEqual({ x: 5, y: 0 })
    expect(vertices[1]).toEqual({ x: 125, y: 0 })
    // Live update must NOT push to undo history
    expect(store().past.length).toBe(pastBefore)
  })
})

// ---------------------------------------------------------------------------
// Checkpoint pattern (one undo entry per drag gesture)
// ---------------------------------------------------------------------------

describe('beginCheckpoint / commitCheckpoint', () => {
  it('creates exactly one undo entry for a whole drag gesture', () => {
    store().addRoom(makeRoom('r1'))
    const pastBefore = store().past.length

    const snapshot = store().beginCheckpoint()
    // Simulate 3 drag frames — none of these should touch undo history
    store().updateRoomVertexLive('r1', 0, { x: 5, y: 0 })
    store().updateRoomVertexLive('r1', 0, { x: 10, y: 0 })
    store().updateRoomVertexLive('r1', 0, { x: 15, y: 0 })
    expect(store().past.length).toBe(pastBefore)  // still clean

    store().commitCheckpoint(snapshot)
    expect(store().past.length).toBe(pastBefore + 1)
  })

  it('undoes the entire drag in one step', () => {
    store().addRoom(makeRoom('r1'))
    const snapshot = store().beginCheckpoint()
    store().updateRoomVertexLive('r1', 0, { x: 15, y: 0 })
    store().commitCheckpoint(snapshot)

    store().undo()
    // Should revert all the way back to the pre-drag position
    expect(store().geometry.rooms[0].vertices[0]).toEqual({ x: 0, y: 0 })
  })
})

// ---------------------------------------------------------------------------
// markSaved
// ---------------------------------------------------------------------------

describe('markSaved', () => {
  it('clears the dirty flag', () => {
    store().addRoom(makeRoom('r1'))
    expect(store().dirty).toBe(true)
    store().markSaved()
    expect(store().dirty).toBe(false)
  })
})
