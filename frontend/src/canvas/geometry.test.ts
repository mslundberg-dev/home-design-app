import { describe, it, expect } from 'vitest'
import { edgeLength, shoelaceArea, polygonCentroid } from './geometry'

// Mirrors backend/tests/test_geometry.py — keep the canonical test cases in sync.

describe('edgeLength', () => {
  it('measures a horizontal edge', () => {
    expect(edgeLength({ x: 0, y: 0 }, { x: 120, y: 0 })).toBe(120)
  })

  it('measures a vertical edge', () => {
    expect(edgeLength({ x: 0, y: 0 }, { x: 0, y: 144 })).toBe(144)
  })

  it('measures a 3-4-5 diagonal', () => {
    expect(edgeLength({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('returns 0 for identical points', () => {
    expect(edgeLength({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0)
  })

  it('works with non-origin points', () => {
    expect(edgeLength({ x: 10, y: 10 }, { x: 10, y: 22 })).toBe(12)
  })
})

describe('shoelaceArea', () => {
  it('computes area for the canonical 10ft×12ft rectangle', () => {
    // 120in × 144in = 17280 sq in = 120 sq ft
    const vertices = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 144 },
      { x: 0, y: 144 },
    ]
    expect(shoelaceArea(vertices)).toBe(120 * 144)
  })

  it('computes area for an L-shaped room', () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 96 },
      { x: 72, y: 96 },
      { x: 72, y: 144 },
      { x: 0, y: 144 },
    ]
    const expected = 120 * 144 - 48 * 48
    expect(shoelaceArea(vertices)).toBe(expected)
  })

  it('computes area for a unit square', () => {
    const vertices = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
    expect(shoelaceArea(vertices)).toBe(1)
  })

  it('is invariant to winding order', () => {
    const ccw = [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 12 }, { x: 0, y: 12 }]
    const cw = [...ccw].reverse()
    expect(shoelaceArea(ccw)).toBe(shoelaceArea(cw))
  })

  it('returns 0 for fewer than 3 vertices', () => {
    expect(shoelaceArea([])).toBe(0)
    expect(shoelaceArea([{ x: 0, y: 0 }])).toBe(0)
    expect(shoelaceArea([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toBe(0)
  })

  it('returns 0 for collinear points', () => {
    expect(shoelaceArea([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }])).toBe(0)
  })
})

describe('polygonCentroid', () => {
  it('finds the center of a square', () => {
    const vertices = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }]
    expect(polygonCentroid(vertices)).toEqual({ x: 2, y: 2 })
  })

  it('finds the center of a rectangle', () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 144 },
      { x: 0, y: 144 },
    ]
    expect(polygonCentroid(vertices)).toEqual({ x: 60, y: 72 })
  })

  it('returns origin for an empty vertex list', () => {
    expect(polygonCentroid([])).toEqual({ x: 0, y: 0 })
  })

  it('returns the single point for a one-vertex list', () => {
    expect(polygonCentroid([{ x: 5, y: 7 }])).toEqual({ x: 5, y: 7 })
  })
})
