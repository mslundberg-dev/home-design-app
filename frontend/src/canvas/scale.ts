// Single source of truth for the pixels <-> real-world-inches conversion.
// Konva works in pixels; the app's geometry model works in inches. Every
// place that needs to convert between the two goes through here.

export const BASE_PIXELS_PER_INCH = 4

export function inchesToPixels(inches: number, zoom: number): number {
  return inches * BASE_PIXELS_PER_INCH * zoom
}

export function pixelsToInches(pixels: number, zoom: number): number {
  return pixels / (BASE_PIXELS_PER_INCH * zoom)
}

export interface ScreenPoint {
  x: number
  y: number
}

export interface WorldPoint {
  x: number
  y: number
}

export function worldToScreen(pt: WorldPoint, zoom: number, pan: ScreenPoint): ScreenPoint {
  return {
    x: inchesToPixels(pt.x, zoom) + pan.x,
    y: inchesToPixels(pt.y, zoom) + pan.y,
  }
}

export function screenToWorld(pt: ScreenPoint, zoom: number, pan: ScreenPoint): WorldPoint {
  return {
    x: pixelsToInches(pt.x - pan.x, zoom),
    y: pixelsToInches(pt.y - pan.y, zoom),
  }
}

/**
 * Computes the pan needed so that the world point currently under
 * `anchorScreen` stays under that same screen position after zooming to
 * `newZoom` — i.e. zoom toward/away from a fixed point (cursor, view
 * center) instead of the content drifting relative to the world origin.
 */
export function computeZoomAroundPoint(
  anchorScreen: ScreenPoint,
  oldZoom: number,
  oldPan: ScreenPoint,
  newZoom: number,
): ScreenPoint {
  const worldPt = screenToWorld(anchorScreen, oldZoom, oldPan)
  return {
    x: anchorScreen.x - inchesToPixels(worldPt.x, newZoom),
    y: anchorScreen.y - inchesToPixels(worldPt.y, newZoom),
  }
}
