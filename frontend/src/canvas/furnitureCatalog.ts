import type { FurnitureType } from '../types'

export interface FurnitureCatalogEntry {
  type: FurnitureType
  label: string
  category: string
  defaultWidth: number   // inches
  defaultHeight: number  // inches
}

export const FURNITURE_CATALOG: FurnitureCatalogEntry[] = [
  // Seating
  { type: 'sofa',          label: 'Sofa',          category: 'Seating',  defaultWidth: 72, defaultHeight: 36 },
  { type: 'armchair',      label: 'Armchair',       category: 'Seating',  defaultWidth: 30, defaultHeight: 30 },
  { type: 'dining-chair',  label: 'Dining Chair',   category: 'Seating',  defaultWidth: 18, defaultHeight: 18 },
  // Tables
  { type: 'dining-table',  label: 'Dining Table',   category: 'Tables',   defaultWidth: 60, defaultHeight: 36 },
  { type: 'coffee-table',  label: 'Coffee Table',   category: 'Tables',   defaultWidth: 48, defaultHeight: 24 },
  { type: 'desk',          label: 'Desk',           category: 'Tables',   defaultWidth: 60, defaultHeight: 30 },
  { type: 'side-table',    label: 'Side Table',     category: 'Tables',   defaultWidth: 18, defaultHeight: 18 },
  // Beds
  { type: 'twin-bed',      label: 'Twin Bed',       category: 'Beds',     defaultWidth: 38, defaultHeight: 75 },
  { type: 'full-bed',      label: 'Full Bed',       category: 'Beds',     defaultWidth: 54, defaultHeight: 75 },
  { type: 'queen-bed',     label: 'Queen Bed',      category: 'Beds',     defaultWidth: 60, defaultHeight: 80 },
  { type: 'king-bed',      label: 'King Bed',       category: 'Beds',     defaultWidth: 76, defaultHeight: 80 },
  // Bathroom
  { type: 'toilet',        label: 'Toilet',         category: 'Bathroom', defaultWidth: 18, defaultHeight: 27 },
  { type: 'bathtub',       label: 'Bathtub',        category: 'Bathroom', defaultWidth: 32, defaultHeight: 60 },
  { type: 'shower',        label: 'Shower',         category: 'Bathroom', defaultWidth: 36, defaultHeight: 36 },
  { type: 'bathroom-sink', label: 'Sink',           category: 'Bathroom', defaultWidth: 20, defaultHeight: 16 },
  // Kitchen
  { type: 'refrigerator',  label: 'Refrigerator',   category: 'Kitchen',  defaultWidth: 30, defaultHeight: 30 },
  { type: 'range',         label: 'Range/Stove',    category: 'Kitchen',  defaultWidth: 30, defaultHeight: 28 },
  { type: 'kitchen-sink',  label: 'Kitchen Sink',   category: 'Kitchen',   defaultWidth: 33, defaultHeight: 22 },
  // Cabinets
  { type: 'base-cabinet',   label: 'Base Cabinet',   category: 'Cabinets',  defaultWidth: 36, defaultHeight: 24 },
  { type: 'upper-cabinet',  label: 'Upper Cabinet',  category: 'Cabinets',  defaultWidth: 36, defaultHeight: 12 },
  { type: 'pantry-cabinet', label: 'Pantry Cabinet', category: 'Cabinets',  defaultWidth: 24, defaultHeight: 24 },
  { type: 'dishwasher',     label: 'Dishwasher',     category: 'Cabinets',  defaultWidth: 24, defaultHeight: 24 },
]

export const FURNITURE_CATEGORIES = ['Seating', 'Tables', 'Beds', 'Bathroom', 'Kitchen', 'Cabinets']

// Default z_elevation by furniture type (inches off floor)
export const DEFAULT_Z_ELEVATION: Record<string, number> = {
  'upper-cabinet': 54,  // sits ~54" above floor (above countertop)
}
