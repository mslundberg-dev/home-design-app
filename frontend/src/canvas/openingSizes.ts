// Standard US residential door and window rough-opening dimensions (inches).

export const DOOR_WIDTHS = [24, 28, 30, 32, 36, 48, 60, 72] as const
export const DOOR_HEIGHTS = [80, 84, 96] as const

// Standard window widths and heights (nominal, finished frame).
// Widths jump in 6" increments; heights commonly sold in 6" steps.
export const WINDOW_WIDTHS = [18, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96] as const
export const WINDOW_HEIGHTS = [18, 24, 30, 36, 42, 48, 54, 60, 72] as const

export const DEFAULT_DOOR_WIDTH = 36
export const DEFAULT_DOOR_HEIGHT = 80
export const DEFAULT_WINDOW_WIDTH = 36
export const DEFAULT_WINDOW_HEIGHT = 48

/** Return the closest standard door width that fits within wallLen. */
export function defaultDoorWidth(wallLen: number): number {
  const fits = [...DOOR_WIDTHS].filter((w) => w <= wallLen)
  return fits.length ? fits[fits.length - 1] : DOOR_WIDTHS[0]
}

/** Return the closest standard window width that fits within wallLen. */
export function defaultWindowWidth(wallLen: number): number {
  const fits = [...WINDOW_WIDTHS].filter((w) => w <= wallLen)
  return fits.length ? fits[fits.length - 1] : WINDOW_WIDTHS[0]
}

/** Format a dimension in inches as ft'-in" for display. */
export function fmtIn(inches: number): string {
  const ft = Math.floor(inches / 12)
  const inn = inches % 12
  if (ft === 0) return `${inn}"`
  if (inn === 0) return `${ft}'-0"`
  return `${ft}'-${inn}"`
}
