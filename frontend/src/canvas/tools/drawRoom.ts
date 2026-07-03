import type { Point } from '../../types'

export const MIN_ROOM_VERTICES = 3
export const CLOSE_DISTANCE_INCHES = 6

export function isCloseToFirstVertex(point: Point, vertices: Point[]): boolean {
  if (vertices.length < MIN_ROOM_VERTICES) return false
  const first = vertices[0]
  return Math.hypot(point.x - first.x, point.y - first.y) <= CLOSE_DISTANCE_INCHES
}
