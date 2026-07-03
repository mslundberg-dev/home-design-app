import type { Point } from '../types'

const ANGLE_SNAP_INCREMENT_DEGREES = 15

export function snapValueToGrid(value: number, gridSizeInches: number): number {
  return Math.round(value / gridSizeInches) * gridSizeInches
}

export function snapPointToGrid(pt: Point, gridSizeInches: number): Point {
  return { x: snapValueToGrid(pt.x, gridSizeInches), y: snapValueToGrid(pt.y, gridSizeInches) }
}

export function snapToAngle(from: Point, to: Point, incrementDegrees = ANGLE_SNAP_INCREMENT_DEGREES): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy)
  if (distance === 0) return { ...to }
  const angleRad = Math.atan2(dy, dx)
  const incrementRad = (incrementDegrees * Math.PI) / 180
  const snappedAngleRad = Math.round(angleRad / incrementRad) * incrementRad
  return {
    x: from.x + Math.cos(snappedAngleRad) * distance,
    y: from.y + Math.sin(snappedAngleRad) * distance,
  }
}

export interface SnapOptions {
  gridEnabled: boolean
  angleEnabled: boolean
  gridSizeInches: number
}

/** Applies angle snap (relative to `from`) then grid snap, in that order. */
export function snapPoint(from: Point | null, to: Point, options: SnapOptions): Point {
  let result = to
  if (options.angleEnabled && from) {
    result = snapToAngle(from, result)
  }
  if (options.gridEnabled) {
    result = snapPointToGrid(result, options.gridSizeInches)
  }
  return result
}
