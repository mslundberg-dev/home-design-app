import { describe, it, expect } from 'vitest'
import { computeSolidSegments } from './geometry'

describe('computeSolidSegments', () => {
  it('returns full wall when no openings', () => {
    expect(computeSolidSegments(120, [])).toEqual([[0, 120]])
  })

  it('splits wall around a single centered opening', () => {
    // Wall 120", door 36" at offset 42"
    expect(computeSolidSegments(120, [{ offset_along_edge: 42, width: 36 }])).toEqual([
      [0, 42],
      [78, 120],
    ])
  })

  it('door flush at wall start leaves only trailing segment', () => {
    expect(computeSolidSegments(120, [{ offset_along_edge: 0, width: 36 }])).toEqual([[36, 120]])
  })

  it('door flush at wall end leaves only leading segment', () => {
    expect(computeSolidSegments(120, [{ offset_along_edge: 84, width: 36 }])).toEqual([[0, 84]])
  })

  it('door spanning entire wall yields no segments', () => {
    expect(computeSolidSegments(120, [{ offset_along_edge: 0, width: 120 }])).toEqual([])
  })

  it('two non-overlapping openings yield three segments', () => {
    const result = computeSolidSegments(120, [
      { offset_along_edge: 10, width: 20 },
      { offset_along_edge: 60, width: 20 },
    ])
    expect(result).toEqual([
      [0, 10],
      [30, 60],
      [80, 120],
    ])
  })

  it('openings given out of order are sorted correctly', () => {
    const result = computeSolidSegments(120, [
      { offset_along_edge: 60, width: 20 },
      { offset_along_edge: 10, width: 20 },
    ])
    expect(result).toEqual([
      [0, 10],
      [30, 60],
      [80, 120],
    ])
  })

  it('opening extending slightly past wall end is clamped', () => {
    // offset 100, width 30 → end would be 130, clamped to 120
    const result = computeSolidSegments(120, [{ offset_along_edge: 100, width: 30 }])
    expect(result).toEqual([[0, 100]])
  })

  it('opening with negative offset is clamped to wall start', () => {
    const result = computeSolidSegments(120, [{ offset_along_edge: -10, width: 20 }])
    // oStart = max(0, -10) = 0, oEnd = min(120, 10) = 10
    expect(result).toEqual([[10, 120]])
  })
})
