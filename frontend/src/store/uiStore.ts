import { create } from 'zustand'
import type { UnitDisplay } from '../units/format'

export type Tool = 'select' | 'draw-room' | 'draw-wall' | 'place-opening'

export type SelectedItem =
  | { type: 'room-edge'; roomId: string; edgeId: string }
  | { type: 'wall'; wallId: string }

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

interface UIState {
  activeTool: Tool
  selectedItem: SelectedItem | null
  zoom: number
  pan: { x: number; y: number }
  snapToGridEnabled: boolean
  snapToAngleEnabled: boolean
  gridSizeInches: number
  unitDisplay: UnitDisplay

  setActiveTool: (tool: Tool) => void
  setSelectedItem: (item: SelectedItem | null) => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  toggleSnapToGrid: () => void
  toggleSnapToAngle: () => void
  setUnitDisplay: (unit: UnitDisplay) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeTool: 'select',
  selectedItem: null,
  zoom: 1,
  pan: { x: 40, y: 40 },
  snapToGridEnabled: true,
  snapToAngleEnabled: true,
  gridSizeInches: 6,
  unitDisplay: 'imperial',

  setActiveTool: (tool) => set({ activeTool: tool, selectedItem: null }),
  setSelectedItem: (item) => set({ selectedItem: item }),
  setZoom: (zoom) => set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),
  setPan: (pan) => set({ pan }),
  toggleSnapToGrid: () => set((s) => ({ snapToGridEnabled: !s.snapToGridEnabled })),
  toggleSnapToAngle: () => set((s) => ({ snapToAngleEnabled: !s.snapToAngleEnabled })),
  setUnitDisplay: (unit) => set({ unitDisplay: unit }),
}))
