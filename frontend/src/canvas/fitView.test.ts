import { describe, it, expect } from 'vitest'
import { computeFitZoomAndPan, STAGE_WIDTH, STAGE_HEIGHT } from './fitView'
import { BASE_PIXELS_PER_INCH } from './scale'
import type { FloorGeometry } from '../types'

const EMPTY: FloorGeometry = { schema_version: 1, north_angle_degrees: 0, rooms: [], walls: [] }

function makeRect(widthIn: number, heightIn: number): FloorGeometry {
  return {
    ...EMPTY,
    rooms: [
      {
        id: 'r1',
        name: 'Room',
        vertices: [
          { x: 0, y: 0 },
          { x: widthIn, y: 0 },
          { x: widthIn, y: heightIn },
          { x: 0, y: heightIn },
        ],
        wall_thickness_default: 6,
        edges: [],
      },
    ],
  }
}

describe('computeFitZoomAndPan', () => {
  it('returns null when there is no content', () => {
    expect(computeFitZoomAndPan(EMPTY, STAGE_WIDTH, STAGE_HEIGHT)).toBeNull()
  })

  it('returns non-null for a room with vertices', () => {
    const result = computeFitZoomAndPan(makeRect(120, 144), STAGE_WIDTH, STAGE_HEIGHT)
    expect(result).not.toBeNull()
  })

  it('centers the content in the stage', () => {
    const geometry = makeRect(120, 144)
    const result = computeFitZoomAndPan(geometry, STAGE_WIDTH, STAGE_HEIGHT)!
    const { zoom, pan } = result

    // After applying zoom+pan, the center of the room (60in, 72in) should map
    // to the center of the stage.
    const centerScreenX = 60 * BASE_PIXELS_PER_INCH * zoom + pan.x
    const centerScreenY = 72 * BASE_PIXELS_PER_INCH * zoom + pan.y
    expect(centerScreenX).toBeCloseTo(STAGE_WIDTH / 2, 0)
    expect(centerScreenY).toBeCloseTo(STAGE_HEIGHT / 2, 0)
  })

  it('fits a 10ft×12ft room within the stage at a reasonable zoom', () => {
    const result = computeFitZoomAndPan(makeRect(120, 144), STAGE_WIDTH, STAGE_HEIGHT)!
    // Zoom should be reasonable — not too small (content fills the stage) and
    // not larger than MAX_AUTO_FIT_ZOOM (3).
    expect(result.zoom).toBeGreaterThan(0.1)
    expect(result.zoom).toBeLessThanOrEqual(3)
  })

  it('keeps content within padded bounds', () => {
    const PADDING = 60
    const geometry = makeRect(120, 144)
    const { zoom, pan } = computeFitZoomAndPan(geometry, STAGE_WIDTH, STAGE_HEIGHT)!

    // All four corners must be within the stage minus padding
    const corners = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 144 },
      { x: 0, y: 144 },
    ]
    for (const corner of corners) {
      const sx = corner.x * BASE_PIXELS_PER_INCH * zoom + pan.x
      const sy = corner.y * BASE_PIXELS_PER_INCH * zoom + pan.y
      expect(sx).toBeGreaterThanOrEqual(PADDING - 1)
      expect(sx).toBeLessThanOrEqual(STAGE_WIDTH - PADDING + 1)
      expect(sy).toBeGreaterThanOrEqual(PADDING - 1)
      expect(sy).toBeLessThanOrEqual(STAGE_HEIGHT - PADDING + 1)
    }
  })

  it('fits a very large room without exceeding MAX_AUTO_FIT_ZOOM', () => {
    // 200ft × 200ft room — zoom should be clamped well below 1
    const result = computeFitZoomAndPan(makeRect(2400, 2400), STAGE_WIDTH, STAGE_HEIGHT)!
    expect(result.zoom).toBeGreaterThan(0)
    expect(result.zoom).toBeLessThan(1)
  })

  it('includes freestanding wall endpoints in bounds calculation', () => {
    const geometry: FloorGeometry = {
      ...EMPTY,
      walls: [
        {
          id: 'w1',
          start: { x: 0, y: 0 },
          end: { x: 500, y: 0 },
          thickness: 4.5,
          wall_type: 'interior',
          openings: [],
        },
      ],
    }
    const result = computeFitZoomAndPan(geometry, STAGE_WIDTH, STAGE_HEIGHT)
    expect(result).not.toBeNull()
    // A 500-inch wide wall at zoom 1 would exceed the stage; zoom should be < 1
    expect(result!.zoom).toBeLessThan(1)
  })
})
