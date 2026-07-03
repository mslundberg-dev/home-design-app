import { describe, it, expect } from 'vitest'
import { snapValueToGrid, snapPointToGrid, snapToAngle, snapPoint } from './snapping'

describe('snapValueToGrid', () => {
  it('rounds to the nearest grid multiple', () => {
    expect(snapValueToGrid(0, 6)).toBe(0)
    expect(snapValueToGrid(6, 6)).toBe(6)
    expect(snapValueToGrid(4, 6)).toBe(6)  // 4 is closer to 6 than 0
    expect(snapValueToGrid(2, 6)).toBe(0)  // 2 is closer to 0
    expect(snapValueToGrid(3, 6)).toBe(6)  // exactly half rounds up (JS Math.round)
  })

  it('works with non-6 grid sizes', () => {
    expect(snapValueToGrid(11, 12)).toBe(12)
    expect(snapValueToGrid(5, 12)).toBe(0)
    expect(snapValueToGrid(24, 12)).toBe(24)
  })

  it('works with negative values', () => {
    expect(snapValueToGrid(-3, 6)).toBe(-6)
    expect(snapValueToGrid(-1, 6)).toBe(0)
  })
})

describe('snapPointToGrid', () => {
  it('snaps both axes independently', () => {
    const snapped = snapPointToGrid({ x: 7, y: 13 }, 6)
    expect(snapped.x).toBe(6)
    expect(snapped.y).toBe(12)
  })

  it('leaves an already-on-grid point unchanged', () => {
    expect(snapPointToGrid({ x: 12, y: 24 }, 6)).toEqual({ x: 12, y: 24 })
  })
})

describe('snapToAngle', () => {
  it('preserves a perfectly horizontal line', () => {
    const result = snapToAngle({ x: 0, y: 0 }, { x: 100, y: 0 })
    expect(result.x).toBeCloseTo(100)
    expect(result.y).toBeCloseTo(0)
  })

  it('preserves a perfectly vertical line', () => {
    const result = snapToAngle({ x: 0, y: 0 }, { x: 0, y: 100 })
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(100)
  })

  it('snaps a 45° diagonal', () => {
    const result = snapToAngle({ x: 0, y: 0 }, { x: 100, y: 100 })
    expect(result.x).toBeCloseTo(100)
    expect(result.y).toBeCloseTo(100)
  })

  it('snaps a near-15° line to exactly 15°', () => {
    // atan2(26, 100) ≈ 14.6°, which rounds to 15°
    const result = snapToAngle({ x: 0, y: 0 }, { x: 100, y: 26 })
    const angle = Math.atan2(result.y - 0, result.x - 0) * (180 / Math.PI)
    expect(angle).toBeCloseTo(15, 1)
  })

  it('preserves distance while snapping angle', () => {
    const from = { x: 10, y: 10 }
    const to = { x: 60, y: 22 }
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    const result = snapToAngle(from, to)
    const resultDist = Math.hypot(result.x - from.x, result.y - from.y)
    expect(resultDist).toBeCloseTo(dist)
  })

  it('returns the same point when distance is zero', () => {
    const pt = { x: 5, y: 7 }
    expect(snapToAngle(pt, pt)).toEqual(pt)
  })

  it('respects custom increment', () => {
    // With 90° increment: angle ≈ 45° snaps to 90°
    const result = snapToAngle({ x: 0, y: 0 }, { x: 100, y: 100 }, 90)
    const angle = Math.atan2(result.y, result.x) * (180 / Math.PI)
    expect(angle).toBeCloseTo(90, 0)
  })
})

describe('snapPoint', () => {
  it('applies angle snap then grid snap when both enabled', () => {
    const from = { x: 0, y: 0 }
    const to = { x: 100, y: 3 }  // near-horizontal
    const result = snapPoint(from, to, { gridEnabled: true, angleEnabled: true, gridSizeInches: 6 })
    // After angle snap → horizontal (y ≈ 0); after grid snap y = 0
    expect(result.y).toBeCloseTo(0, 0)
    // x should be snapped to nearest 6
    expect(result.x % 6).toBeCloseTo(0, 5)
  })

  it('applies only grid snap when angle disabled', () => {
    const result = snapPoint(null, { x: 7, y: 13 }, { gridEnabled: true, angleEnabled: false, gridSizeInches: 6 })
    expect(result).toEqual({ x: 6, y: 12 })
  })

  it('applies only angle snap when grid disabled', () => {
    const from = { x: 0, y: 0 }
    const to = { x: 100, y: 2 }  // nearly horizontal
    const result = snapPoint(from, to, { gridEnabled: false, angleEnabled: true, gridSizeInches: 6 })
    expect(result.y).toBeCloseTo(0, 0)
  })

  it('returns the raw point when both snaps disabled', () => {
    const to = { x: 7.3, y: 11.9 }
    const result = snapPoint(null, to, { gridEnabled: false, angleEnabled: false, gridSizeInches: 6 })
    expect(result).toEqual(to)
  })

  it('skips angle snap when from is null even if angleEnabled', () => {
    const to = { x: 7, y: 13 }
    const result = snapPoint(null, to, { gridEnabled: true, angleEnabled: true, gridSizeInches: 6 })
    // No angle snap (from is null), only grid snap
    expect(result).toEqual({ x: 6, y: 12 })
  })
})
