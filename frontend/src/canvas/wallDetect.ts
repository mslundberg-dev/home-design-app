import type { FloorGeometry, Point } from '../types'

export type WallHit =
  | { kind: 'edge'; roomId: string; edgeId: string; wallStart: Point; wallEnd: Point; wallLen: number; offset: number }
  | { kind: 'wall'; wallId: string; wallStart: Point; wallEnd: Point; wallLen: number; offset: number }

export function findNearestWallHit(
  worldPt: Point,
  geometry: FloorGeometry,
  thresholdInches: number,
): WallHit | null {
  let best: WallHit | null = null
  let bestDist = thresholdInches

  for (const room of geometry.rooms) {
    for (const edge of room.edges) {
      const v1 = room.vertices[edge.start_vertex_index]
      const v2 = room.vertices[edge.end_vertex_index]
      const { dist, t } = projectOntoSegment(worldPt, v1, v2)
      if (dist < bestDist) {
        bestDist = dist
        const wallLen = Math.hypot(v2.x - v1.x, v2.y - v1.y)
        best = { kind: 'edge', roomId: room.id, edgeId: edge.id, wallStart: v1, wallEnd: v2, wallLen, offset: t * wallLen }
      }
    }
  }

  for (const wall of geometry.walls) {
    const { dist, t } = projectOntoSegment(worldPt, wall.start, wall.end)
    if (dist < bestDist) {
      bestDist = dist
      const wallLen = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
      best = { kind: 'wall', wallId: wall.id, wallStart: wall.start, wallEnd: wall.end, wallLen, offset: t * wallLen }
    }
  }

  return best
}

function projectOntoSegment(p: Point, a: Point, b: Point): { dist: number; t: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < 0.001) return { dist: Math.hypot(p.x - a.x, p.y - a.y), t: 0 }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return { dist: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)), t }
}
