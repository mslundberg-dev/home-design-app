export interface FurnitureDef {
  heightIn: number  // 3D rendered height in inches
  color: number     // three.js hex color
}

export const FURNITURE_HEIGHTS: Record<string, FurnitureDef> = {
  'sofa':           { heightIn: 30,  color: 0x8b7355 },
  'armchair':       { heightIn: 30,  color: 0x9b8060 },
  'dining-chair':   { heightIn: 32,  color: 0xa08060 },
  'dining-table':   { heightIn: 30,  color: 0xc8a878 },
  'coffee-table':   { heightIn: 16,  color: 0xb89060 },
  'desk':           { heightIn: 30,  color: 0xb0906a },
  'side-table':     { heightIn: 24,  color: 0xc0a070 },
  'twin-bed':       { heightIn: 20,  color: 0x9090c0 },
  'full-bed':       { heightIn: 20,  color: 0x8888b8 },
  'queen-bed':      { heightIn: 24,  color: 0x8080b0 },
  'king-bed':       { heightIn: 24,  color: 0x7070a8 },
  'toilet':         { heightIn: 28,  color: 0xe8e8e8 },
  'bathtub':        { heightIn: 20,  color: 0xd8d8f0 },
  'shower':         { heightIn: 84,  color: 0xd0e8f0 },
  'bathroom-sink':  { heightIn: 32,  color: 0xe0e0e8 },
  'refrigerator':   { heightIn: 68,  color: 0xd0d0d8 },
  'range':          { heightIn: 36,  color: 0x888888 },
  'kitchen-sink':   { heightIn: 36,  color: 0xc0c8cc },
  // Cabinets
  'base-cabinet':   { heightIn: 36,  color: 0xc8b89a },
  'upper-cabinet':  { heightIn: 30,  color: 0xd4c8b0 },
  'pantry-cabinet': { heightIn: 84,  color: 0xbcaa88 },
  'dishwasher':     { heightIn: 34,  color: 0xb0b8c0 },
}

export const FURNITURE_HEIGHT_DEFAULT: FurnitureDef = { heightIn: 30, color: 0xaaaaaa }
