import type { FloorGeometry } from '../types'
import { BASE_PIXELS_PER_INCH, inchesToPixels } from './scale'

export const STAGE_WIDTH = 900
export const STAGE_HEIGHT = 640

const MIN_ZOOM = 0.1
const MAX_AUTO_FIT_ZOOM = 3

function computeContentBoundsInches(geometry: FloorGeometry) {
  const points = geometry.rooms.flatMap((r) => r.vertices)
  for (const w of geometry.walls) {
    points.push(w.start, w.end)
  }
  if (points.length === 0) return null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

/** Computes zoom/pan so all drawn content fits within the stage, centered. */
export function computeFitZoomAndPan(
  geometry: FloorGeometry,
  stageWidth: number,
  stageHeight: number,
  paddingPx = 60,
): { zoom: number; pan: { x: number; y: number } } | null {
  const bounds = computeContentBoundsInches(geometry)
  if (!bounds) return null

  const contentWidthIn = Math.max(bounds.maxX - bounds.minX, 1)
  const contentHeightIn = Math.max(bounds.maxY - bounds.minY, 1)
  const availableWidth = Math.max(stageWidth - paddingPx * 2, 50)
  const availableHeight = Math.max(stageHeight - paddingPx * 2, 50)

  const zoom = Math.min(
    availableWidth / (contentWidthIn * BASE_PIXELS_PER_INCH),
    availableHeight / (contentHeightIn * BASE_PIXELS_PER_INCH),
    MAX_AUTO_FIT_ZOOM,
  )
  const clampedZoom = Math.max(zoom, MIN_ZOOM)

  const centerIn = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
  const pan = {
    x: stageWidth / 2 - inchesToPixels(centerIn.x, clampedZoom),
    y: stageHeight / 2 - inchesToPixels(centerIn.y, clampedZoom),
  }
  return { zoom: clampedZoom, pan }
}
