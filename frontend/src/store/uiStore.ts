import { create } from 'zustand'
import type { UnitDisplay } from '../units/format'
import type { FurnitureType } from '../types'
import { DEFAULT_DOOR_WIDTH, DEFAULT_DOOR_HEIGHT, DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT } from '../canvas/openingSizes'
import type { DoorSubtype, WindowSubtype } from '../canvas/openingTypes'
import { DEFAULT_DOOR_SUBTYPE, DEFAULT_WINDOW_SUBTYPE } from '../canvas/openingTypes'

export type Tool = 'select' | 'draw-room' | 'draw-wall' | 'place-door' | 'place-window' | 'place-furniture'

export type SelectedItem =
  | { type: 'room-edge'; roomId: string; edgeId: string }
  | { type: 'wall'; wallId: string }
  | { type: 'furniture'; furnitureId: string }
  | { type: 'opening'; openingId: string; roomId: string; edgeId: string }
  | { type: 'wall-opening'; openingId: string; wallId: string }

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
  pendingFurnitureType: FurnitureType | null
  showFurniturePanel: boolean

  // Pending sizes for click-to-place tools (standard sizes in inches)
  pendingDoorWidth: number
  pendingDoorHeight: number
  pendingWindowWidth: number
  pendingWindowHeight: number
  pendingDoorSubtype: DoorSubtype
  pendingWindowSubtype: WindowSubtype
  showDoorPanel: boolean
  showWindowPanel: boolean

  setActiveTool: (tool: Tool) => void
  setSelectedItem: (item: SelectedItem | null) => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  toggleSnapToGrid: () => void
  toggleSnapToAngle: () => void
  setGridSize: (inches: number) => void
  setUnitDisplay: (unit: UnitDisplay) => void
  setPendingFurnitureType: (type: FurnitureType | null) => void
  setShowFurniturePanel: (show: boolean) => void
  setPendingDoorSize: (width: number, height: number) => void
  setPendingWindowSize: (width: number, height: number) => void
  setPendingDoorSubtype: (subtype: DoorSubtype) => void
  setPendingWindowSubtype: (subtype: WindowSubtype) => void
  setShowDoorPanel: (show: boolean) => void
  setShowWindowPanel: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeTool: 'select',
  selectedItem: null,
  zoom: 1,
  pan: { x: 40, y: 40 },
  snapToGridEnabled: true,
  snapToAngleEnabled: true,
  gridSizeInches: 1,
  unitDisplay: 'imperial',
  pendingFurnitureType: null,
  showFurniturePanel: false,
  pendingDoorWidth: DEFAULT_DOOR_WIDTH,
  pendingDoorHeight: DEFAULT_DOOR_HEIGHT,
  pendingWindowWidth: DEFAULT_WINDOW_WIDTH,
  pendingWindowHeight: DEFAULT_WINDOW_HEIGHT,
  pendingDoorSubtype: DEFAULT_DOOR_SUBTYPE,
  pendingWindowSubtype: DEFAULT_WINDOW_SUBTYPE,
  showDoorPanel: false,
  showWindowPanel: false,

  setActiveTool: (tool) => set({ activeTool: tool, selectedItem: null }),
  setSelectedItem: (item) => set({ selectedItem: item }),
  setZoom: (zoom) => set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),
  setPan: (pan) => set({ pan }),
  toggleSnapToGrid: () => set((s) => ({ snapToGridEnabled: !s.snapToGridEnabled })),
  toggleSnapToAngle: () => set((s) => ({ snapToAngleEnabled: !s.snapToAngleEnabled })),
  setGridSize: (inches) => set({ gridSizeInches: inches }),
  setUnitDisplay: (unit) => set({ unitDisplay: unit }),
  setPendingFurnitureType: (type) => set({ pendingFurnitureType: type }),
  setShowFurniturePanel: (show) => set({ showFurniturePanel: show }),
  setPendingDoorSize: (width, height) => set({ pendingDoorWidth: width, pendingDoorHeight: height }),
  setPendingWindowSize: (width, height) => set({ pendingWindowWidth: width, pendingWindowHeight: height }),
  setPendingDoorSubtype: (subtype) => set({ pendingDoorSubtype: subtype }),
  setPendingWindowSubtype: (subtype) => set({ pendingWindowSubtype: subtype }),
  setShowDoorPanel: (show) => set({ showDoorPanel: show }),
  setShowWindowPanel: (show) => set({ showWindowPanel: show }),
}))
