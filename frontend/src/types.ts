// Field names intentionally match the backend Pydantic schemas (snake_case)
// so JSON round-trips to/from the API without a translation layer.

export interface Point {
  x: number
  y: number
}

export type OpeningType = 'door' | 'window'
export type SwingDirection = 'left' | 'right'
export type WallType = 'exterior' | 'interior'

export interface Opening {
  id: string
  type: OpeningType
  subtype?: string | null
  offset_along_edge: number
  width: number
  height: number
  swing_direction?: SwingDirection | null
}

export interface Edge {
  id: string
  start_vertex_index: number
  end_vertex_index: number
  thickness: number
  wall_type: WallType
  openings: Opening[]
  height_inches: number
}

export interface Room {
  id: string
  name: string
  vertices: Point[]
  wall_thickness_default: number
  edges: Edge[]
}

export interface Wall {
  id: string
  start: Point
  end: Point
  thickness: number
  wall_type: WallType
  openings: Opening[]
  height_inches: number
}

export type FurnitureType =
  | 'sofa' | 'armchair' | 'dining-chair'
  | 'dining-table' | 'coffee-table' | 'desk' | 'side-table'
  | 'twin-bed' | 'full-bed' | 'queen-bed' | 'king-bed'
  | 'toilet' | 'bathtub' | 'shower' | 'bathroom-sink'
  | 'refrigerator' | 'range' | 'kitchen-sink'
  | 'base-cabinet' | 'upper-cabinet' | 'pantry-cabinet' | 'dishwasher'

export interface Furniture {
  id: string
  type: FurnitureType
  x: number          // center x, world inches
  y: number          // center y, world inches
  width: number      // inches
  height: number     // inches (depth in plan view)
  rotation: number   // degrees
  z_elevation: number // inches off the floor (0 = on floor)
}

export interface FloorGeometry {
  schema_version: number
  north_angle_degrees: number
  rooms: Room[]
  walls: Wall[]
  furniture: Furniture[]
}

export interface Project {
  id: number
  name: string
  address: string | null
  units_preference: 'imperial' | 'metric'
  created_at: string
  updated_at: string
}

export interface Floor {
  id: number
  project_id: number
  name: string
  floor_index: number
  elevation_inches: number
  geometry: FloorGeometry
  created_at: string
  updated_at: string
}
