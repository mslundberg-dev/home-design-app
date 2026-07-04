import { useCallback } from 'react'
import { useUIStore } from '../store/uiStore'
import { useFloorStore } from '../store/floorStore'
import { ElevationCanvas } from '../canvas/ElevationCanvas'
import { FURNITURE_CATALOG, DEFAULT_Z_ELEVATION } from '../canvas/furnitureCatalog'
import type { Furniture } from '../types'

const CABINET_TYPES = FURNITURE_CATALOG.filter((e) => e.category === 'Cabinets')

export function ElevationPanel() {
  const elevationRef = useUIStore((s) => s.elevationRef)
  const setElevationRef = useUIStore((s) => s.setElevationRef)
  const geometry = useFloorStore((s) => s.geometry)
  const addFurniture = useFloorStore((s) => s.addFurniture)
  const updateFurnitureLive = useFloorStore((s) => s.updateFurnitureLive)
  const updateFurniture = useFloorStore((s) => s.updateFurniture)

  const handleUpdateFurniture = useCallback(
    (item: Furniture) => {
      updateFurnitureLive(item)
      updateFurniture(item)
    },
    [updateFurnitureLive, updateFurniture],
  )

  if (!elevationRef) return null

  function handleAddCabinet(type: string, defaultWidth: number, defaultDepth: number) {
    const newItem: Furniture = {
      id: crypto.randomUUID(),
      type: type as Furniture['type'],
      x: 24,
      y: 12,
      width: defaultWidth,
      height: defaultDepth,
      rotation: 0,
      z_elevation: DEFAULT_Z_ELEVATION[type] ?? 0,
    }
    addFurniture(newItem)
  }

  return (
    <div className="elevation-panel">
      <div className="elevation-panel-header">
        <span className="elevation-panel-title">Wall Elevation</span>
        <div className="elevation-cabinet-palette">
          {CABINET_TYPES.map((entry) => (
            <button
              key={entry.type}
              className="btn-cabinet"
              title={`Add ${entry.label}`}
              onClick={() => handleAddCabinet(entry.type, entry.defaultWidth, entry.defaultHeight)}
            >
              + {entry.label}
            </button>
          ))}
        </div>
        <button
          className="btn-close-elevation"
          onClick={() => setElevationRef(null)}
          title="Close elevation view"
        >
          ✕
        </button>
      </div>
      <div className="elevation-canvas-wrap">
        <ElevationCanvas
          elevationRef={elevationRef}
          geometry={geometry}
          onUpdateFurniture={handleUpdateFurniture}
        />
      </div>
    </div>
  )
}
