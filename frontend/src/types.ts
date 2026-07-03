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
}

export interface FloorGeometry {
  schema_version: number
  north_angle_degrees: number
  rooms: Room[]
  walls: Wall[]
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
