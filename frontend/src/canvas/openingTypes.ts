export type DoorSubtype = 'single' | 'double' | 'sliding' | 'pocket' | 'bifold' | 'garage'
export type WindowSubtype = 'single-hung' | 'casement' | 'sliding' | 'fixed' | 'awning'

export interface OpeningTypeEntry {
  subtype: DoorSubtype | WindowSubtype
  label: string
  description: string
}

export const DOOR_TYPES: OpeningTypeEntry[] = [
  { subtype: 'single',  label: 'Single',  description: 'Standard hinged door' },
  { subtype: 'double',  label: 'Double',  description: 'French / double hinged doors' },
  { subtype: 'sliding', label: 'Sliding', description: 'Sliding glass door' },
  { subtype: 'pocket',  label: 'Pocket',  description: 'Slides into the wall cavity' },
  { subtype: 'bifold',  label: 'Bifold',  description: 'Folding panel door' },
  { subtype: 'garage',  label: 'Garage',  description: 'Overhead garage door' },
]

export const WINDOW_TYPES: OpeningTypeEntry[] = [
  { subtype: 'single-hung', label: 'Single / Double Hung', description: 'Sash slides vertically' },
  { subtype: 'casement',    label: 'Casement',             description: 'Hinged on the side, opens outward' },
  { subtype: 'sliding',     label: 'Sliding',              description: 'Sash slides horizontally' },
  { subtype: 'fixed',       label: 'Fixed / Picture',      description: 'Non-operable, view window' },
  { subtype: 'awning',      label: 'Awning',               description: 'Hinged at top, opens outward' },
]

export const DEFAULT_DOOR_SUBTYPE: DoorSubtype = 'single'
export const DEFAULT_WINDOW_SUBTYPE: WindowSubtype = 'single-hung'
