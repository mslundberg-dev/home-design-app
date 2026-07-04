import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '../store/uiStore'
import { useFloorStore } from '../store/floorStore'
import { ElevationCanvas } from '../canvas/ElevationCanvas'
import { FURNITURE_CATALOG, DEFAULT_Z_ELEVATION } from '../canvas/furnitureCatalog'
import type { Furniture } from '../types'

const CABINET_TYPES = FURNITURE_CATALOG.filter((e) => e.category === 'Cabinets')

export function ElevationPanel() {
  const elevationRef = useUIStore((s) => s.elevationRef)
  const setElevationRef = useUIStore((s) => s.setElevationRef)
  const selectedItem = useUIStore((s) => s.selectedItem)
  const geometry = useFloorStore((s) => s.geometry)
  const addFurniture = useFloorStore((s) => s.addFurniture)
  const updateFurnitureLive = useFloorStore((s) => s.updateFurnitureLive)
  const updateFurniture = useFloorStore((s) => s.updateFurniture)

  const [selectedElevationItem, setSelectedElevationItem] = useState<Furniture | null>(null)
  const [zInput, setZInput] = useState('')

  // Auto-switch elevation view when user selects a different wall (panel must already be open)
  useEffect(() => {
    if (!elevationRef || !selectedItem) return
    if (selectedItem.type === 'room-edge') {
      setElevationRef(`room:${selectedItem.roomId}:${selectedItem.edgeId}`)
    } else if (selectedItem.type === 'wall') {
      setElevationRef(`wall:${selectedItem.wallId}`)
    }
  }, [selectedItem])

  // Keep zInput in sync with the selected item (update from canvas drags)
  useEffect(() => {
    if (!selectedElevationItem) { setZInput(''); return }
    const live = (geometry.furniture ?? []).find((f) => f.id === selectedElevationItem.id)
    if (live) {
      setSelectedElevationItem(live)
      setZInput(String(live.z_elevation ?? 0))
    }
  }, [geometry.furniture, selectedElevationItem?.id])

  const handleSelectFurniture = useCallback((item: Furniture | null) => {
    setSelectedElevationItem(item)
    setZInput(item ? String(item.z_elevation ?? 0) : '')
  }, [])

  const handleUpdateFurniture = useCallback((item: Furniture) => {
    updateFurnitureLive(item)
    updateFurniture(item)
    setSelectedElevationItem(item)
    setZInput(String(item.z_elevation ?? 0))
  }, [updateFurnitureLive, updateFurniture])

  function commitZInput() {
    if (!selectedElevationItem) return
    const parsed = parseFloat(zInput)
    if (isNaN(parsed) || parsed < 0) return
    const updated = { ...selectedElevationItem, z_elevation: parsed }
    updateFurnitureLive(updated)
    updateFurniture(updated)
    setSelectedElevationItem(updated)
  }

  function handleAddCabinet(type: string, defaultWidth: number, defaultDepth: number) {
    const newItem: Furniture = {
      id: crypto.randomUUID(),
      type: type as Furniture['type'],
      x: 12,
      y: 12,
      width: defaultWidth,
      height: defaultDepth,
      rotation: 0,
      z_elevation: DEFAULT_Z_ELEVATION[type] ?? 0,
    }
    addFurniture(newItem)
  }

  if (!elevationRef) return null

  return (
    <div className="elevation-panel">
      <div className="elevation-panel-header">
        <span className="elevation-panel-title">Wall Elevation</span>

        {selectedElevationItem ? (
          <div className="elevation-z-editor">
            <span className="elevation-z-label">
              {selectedElevationItem.type.replace(/-/g, ' ')} — Z elevation:
            </span>
            <input
              className="elevation-z-input"
              type="number"
              min={0}
              step={0.5}
              value={zInput}
              onChange={(e) => setZInput(e.target.value)}
              onBlur={commitZInput}
              onKeyDown={(e) => { if (e.key === 'Enter') commitZInput() }}
            />
            <span className="elevation-z-unit">in</span>
          </div>
        ) : (
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
        )}

        <button
          className="btn-close-elevation"
          onClick={() => { setElevationRef(null); setSelectedElevationItem(null) }}
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
          onSelectFurniture={handleSelectFurniture}
          selectedFurnitureId={selectedElevationItem?.id ?? null}
        />
      </div>
    </div>
  )
}
