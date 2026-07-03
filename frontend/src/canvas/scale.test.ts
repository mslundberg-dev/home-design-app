import { describe, it, expect } from 'vitest'
import {
  BASE_PIXELS_PER_INCH,
  inchesToPixels,
  pixelsToInches,
  worldToScreen,
  screenToWorld,
  computeZoomAroundPoint,
} from './scale'

describe('inchesToPixels / pixelsToInches', () => {
  it('converts inches to pixels at zoom 1', () => {
    expect(inchesToPixels(1, 1)).toBe(BASE_PIXELS_PER_INCH)
    expect(inchesToPixels(12, 1)).toBe(12 * BASE_PIXELS_PER_INCH)
  })

  it('scales with zoom', () => {
    expect(inchesToPixels(10, 2)).toBe(10 * BASE_PIXELS_PER_INCH * 2)
    expect(inchesToPixels(10, 0.5)).toBe(10 * BASE_PIXELS_PER_INCH * 0.5)
  })

  it('pixelsToInches is the inverse of inchesToPixels', () => {
    const inches = 36
    const zoom = 1.5
    const roundTrip = pixelsToInches(inchesToPixels(inches, zoom), zoom)
    expect(roundTrip).toBeCloseTo(inches)
  })

  it('pixelsToInches at zoom 1', () => {
    expect(pixelsToInches(BASE_PIXELS_PER_INCH, 1)).toBe(1)
    expect(pixelsToInches(BASE_PIXELS_PER_INCH * 12, 1)).toBe(12)
  })
})

describe('worldToScreen / screenToWorld', () => {
  it('converts world origin to screen pan offset', () => {
    const pan = { x: 40, y: 40 }
    const s = worldToScreen({ x: 0, y: 0 }, 1, pan)
    expect(s.x).toBe(40)
    expect(s.y).toBe(40)
  })

  it('converts a known world point at zoom 1 with zero pan', () => {
    // 12 inches at zoom 1 = 12 * BASE_PIXELS_PER_INCH pixels
    const s = worldToScreen({ x: 12, y: 24 }, 1, { x: 0, y: 0 })
    expect(s.x).toBe(12 * BASE_PIXELS_PER_INCH)
    expect(s.y).toBe(24 * BASE_PIXELS_PER_INCH)
  })

  it('screenToWorld is the inverse of worldToScreen', () => {
    const world = { x: 30, y: 45 }
    const zoom = 1.25
    const pan = { x: 60, y: 80 }
    const screen = worldToScreen(world, zoom, pan)
    const back = screenToWorld(screen, zoom, pan)
    expect(back.x).toBeCloseTo(world.x)
    expect(back.y).toBeCloseTo(world.y)
  })

  it('screenToWorld at known screen coords with pan', () => {
    // screen (100, 100), zoom 1, pan (0, 0) → world (100/4, 100/4) = (25, 25)
    const w = screenToWorld({ x: 100, y: 100 }, 1, { x: 0, y: 0 })
    expect(w.x).toBeCloseTo(25)
    expect(w.y).toBeCloseTo(25)
  })
})

describe('computeZoomAroundPoint', () => {
  it('keeps the world point under the anchor screen position after zoom', () => {
    const anchor = { x: 100, y: 100 }
    const oldZoom = 1
    const oldPan = { x: 0, y: 0 }
    const newZoom = 2
    const newPan = computeZoomAroundPoint(anchor, oldZoom, oldPan, newZoom)

    // The world point that was under anchor at the old zoom should still be
    // under anchor at the new zoom with the new pan.
    const worldBefore = screenToWorld(anchor, oldZoom, oldPan)
    const screenAfter = worldToScreen(worldBefore, newZoom, newPan)
    expect(screenAfter.x).toBeCloseTo(anchor.x)
    expect(screenAfter.y).toBeCloseTo(anchor.y)
  })

  it('keeps anchor fixed when zooming out', () => {
    const anchor = { x: 450, y: 320 }
    const oldZoom = 2
    const oldPan = { x: -200, y: -150 }
    const newZoom = 1

    const newPan = computeZoomAroundPoint(anchor, oldZoom, oldPan, newZoom)
    const worldBefore = screenToWorld(anchor, oldZoom, oldPan)
    const screenAfter = worldToScreen(worldBefore, newZoom, newPan)
    expect(screenAfter.x).toBeCloseTo(anchor.x)
    expect(screenAfter.y).toBeCloseTo(anchor.y)
  })

  it('returns correct pan when zooming 1x → 2x around screen origin', () => {
    // anchor = {0,0}, world point = {0,0}, after zoom pan must still place world(0,0) at screen(0,0)
    const newPan = computeZoomAroundPoint({ x: 0, y: 0 }, 1, { x: 0, y: 0 }, 2)
    expect(newPan.x).toBeCloseTo(0)
    expect(newPan.y).toBeCloseTo(0)
  })
})
