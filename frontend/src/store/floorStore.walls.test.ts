import { describe, it, expect, beforeEach } from 'vitest'
import { useFloorStore } from './floorStore'
import type { Wall, Opening } from '../types'

function makeWall(overrides?: Partial<Wall>): Wall {
  return {
    id: 'w1',
    start: { x: 0, y: 0 },
    end: { x: 120, y: 0 },
    thickness: 4.5,
    wall_type: 'interior',
    openings: [],
    ...overrides,
  }
}

function makeOpening(overrides?: Partial<Opening>): Opening {
  return {
    id: 'o1',
    type: 'door',
    offset_along_edge: 42,
    width: 36,
    height: 80,
    swing_direction: 'left',
    ...overrides,
  }
}

beforeEach(() => {
  useFloorStore.setState({
    geometry: { schema_version: 1, north_angle_degrees: 0, rooms: [], walls: [] },
    past: [],
    future: [],
    dirty: false,
  })
})

describe('addWall / removeWall', () => {
  it('addWall appends a wall', () => {
    const wall = makeWall()
    useFloorStore.getState().addWall(wall)
    expect(useFloorStore.getState().geometry.walls).toHaveLength(1)
    expect(useFloorStore.getState().geometry.walls[0].id).toBe('w1')
  })

  it('addWall pushes one undo entry', () => {
    useFloorStore.getState().addWall(makeWall())
    expect(useFloorStore.getState().past).toHaveLength(1)
  })

  it('removeWall deletes the wall by id', () => {
    useFloorStore.getState().addWall(makeWall())
    useFloorStore.getState().removeWall('w1')
    expect(useFloorStore.getState().geometry.walls).toHaveLength(0)
  })

  it('removeWall on unknown id is a no-op', () => {
    useFloorStore.getState().addWall(makeWall())
    useFloorStore.getState().removeWall('nope')
    expect(useFloorStore.getState().geometry.walls).toHaveLength(1)
  })
})

describe('updateWallVertexLive / updateWallEndpointsLive', () => {
  it('updateWallVertexLive moves start without pushing history', () => {
    useFloorStore.getState().addWall(makeWall())
    const pastLenBefore = useFloorStore.getState().past.length
    useFloorStore.getState().updateWallVertexLive('w1', 'start', { x: 10, y: 5 })
    expect(useFloorStore.getState().geometry.walls[0].start).toEqual({ x: 10, y: 5 })
    expect(useFloorStore.getState().past).toHaveLength(pastLenBefore)
  })

  it('updateWallVertexLive moves end without pushing history', () => {
    useFloorStore.getState().addWall(makeWall())
    const pastLenBefore = useFloorStore.getState().past.length
    useFloorStore.getState().updateWallVertexLive('w1', 'end', { x: 200, y: 0 })
    expect(useFloorStore.getState().geometry.walls[0].end).toEqual({ x: 200, y: 0 })
    expect(useFloorStore.getState().past).toHaveLength(pastLenBefore)
  })

  it('updateWallEndpointsLive moves both endpoints without pushing history', () => {
    useFloorStore.getState().addWall(makeWall())
    const pastLenBefore = useFloorStore.getState().past.length
    useFloorStore.getState().updateWallEndpointsLive('w1', { x: 5, y: 5 }, { x: 125, y: 5 })
    const w = useFloorStore.getState().geometry.walls[0]
    expect(w.start).toEqual({ x: 5, y: 5 })
    expect(w.end).toEqual({ x: 125, y: 5 })
    expect(useFloorStore.getState().past).toHaveLength(pastLenBefore)
  })
})

describe('addOpening / removeOpening / updateOpening on wall', () => {
  beforeEach(() => {
    useFloorStore.getState().addWall(makeWall())
  })

  it('addOpening appends an opening to the wall', () => {
    const target = { wallId: 'w1' }
    useFloorStore.getState().addOpening(target, makeOpening())
    expect(useFloorStore.getState().geometry.walls[0].openings).toHaveLength(1)
    expect(useFloorStore.getState().geometry.walls[0].openings[0].id).toBe('o1')
  })

  it('addOpening pushes one undo entry', () => {
    const pastBefore = useFloorStore.getState().past.length
    useFloorStore.getState().addOpening({ wallId: 'w1' }, makeOpening())
    expect(useFloorStore.getState().past).toHaveLength(pastBefore + 1)
  })

  it('removeOpening removes opening by id', () => {
    useFloorStore.getState().addOpening({ wallId: 'w1' }, makeOpening())
    useFloorStore.getState().removeOpening({ wallId: 'w1' }, 'o1')
    expect(useFloorStore.getState().geometry.walls[0].openings).toHaveLength(0)
  })

  it('updateOpening replaces opening in place', () => {
    useFloorStore.getState().addOpening({ wallId: 'w1' }, makeOpening())
    const updated = makeOpening({ width: 48, swing_direction: 'right' })
    useFloorStore.getState().updateOpening({ wallId: 'w1' }, updated)
    const o = useFloorStore.getState().geometry.walls[0].openings[0]
    expect(o.width).toBe(48)
    expect(o.swing_direction).toBe('right')
  })
})

describe('undo restores wall state', () => {
  it('undoes addWall', () => {
    useFloorStore.getState().addWall(makeWall())
    useFloorStore.getState().undo()
    expect(useFloorStore.getState().geometry.walls).toHaveLength(0)
  })

  it('redoes addWall after undo', () => {
    useFloorStore.getState().addWall(makeWall())
    useFloorStore.getState().undo()
    useFloorStore.getState().redo()
    expect(useFloorStore.getState().geometry.walls).toHaveLength(1)
  })
})
