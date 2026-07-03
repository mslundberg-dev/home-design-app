// Mirrors backend/app/geometry.py intentionally: the client needs
// zero-latency feedback while drawing (live dimension/area labels), the
// server needs the same math to render the PDF from persisted data.
// Kept in sync via the shared 10ft x 12ft rectangle test case on both sides.

import type { Point } from '../types'

export function edgeLength(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

export function shoelaceArea(vertices: Point[]): number {
  const n = vertices.length
  if (n < 3) return 0
  let total = 0
  for (let i = 0; i < n; i++) {
    const { x: x1, y: y1 } = vertices[i]
    const { x: x2, y: y2 } = vertices[(i + 1) % n]
    total += x1 * y2 - x2 * y1
  }
  return Math.abs(total) / 2
}

export function polygonCentroid(vertices: Point[]): Point {
  const n = vertices.length
  if (n === 0) return { x: 0, y: 0 }
  const sum = vertices.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 })
  return { x: sum.x / n, y: sum.y / n }
}
