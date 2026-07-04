import { useState, useEffect, useCallback, useRef } from 'react'
import { useUIStore } from '../store/uiStore'
import { useFloorStore } from '../store/floorStore'
import { ElevationCanvas } from '../canvas/ElevationCanvas'
import { FURNITURE_CATALOG, DEFAULT_Z_ELEVATION } from '../canvas/furnitureCatalog'
import type { Furniture } from '../types'

const CABINET_TYPES = FURNITURE_CATALOG.filter((e) => e.category === 'Cabinets')
const MIN_HEIGHT = 160
const MAX_HEIGHT = 600
const DEFAULT_HEIGHT = 260

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
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT)
  const dragStartY = useRef<number | null>(null)
  const dragStartHeight = useRef<number>(DEFAULT_HEIGHT)

  // Use a ref to avoid stale closure — always see the latest elevationRef
  const elevationRefRef = useRef(elevationRef)
  useEffect(() => { elevationRefRef.current = elevationRef }, [elevationRef])

  // Auto-switch elevation canvas when user selects a different wall (panel must be open)
  useEffect(() => {
    if (!elevationRefRef.current || !selectedItem) return
    if (selectedItem.type === 'room-edge') {
      setElevationRef(`room:${selectedItem.roomId}:${selectedItem.edgeId}`)
    } else if (selectedItem.type === 'wall') {
      setElevationRef(`wall:${selectedItem.wallId}`)
    }
  }, [selectedItem, setElevationRef])

  // Keep zInput in sync with the selected item when geometry changes (e.g. after drag)
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
    addFurniture({
      id: crypto.randomUUID(),
      type: type as Furniture['type'],
      x: 12, y: 12,
      width: defaultWidth, height: defaultDepth,
      rotation: 0,
      z_elevation: DEFAULT_Z_ELEVATION[type] ?? 0,
    })
  }

  // Drag-to-resize: dragging the top handle up makes the panel taller
  function onHandleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    dragStartY.current = e.clientY
    dragStartHeight.current = panelHeight

    function onMouseMove(ev: MouseEvent) {
      if (dragStartY.current === null) return
      const delta = dragStartY.current - ev.clientY   // drag up → positive → taller
      const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current + delta))
      setPanelHeight(newH)
    }

    function onMouseUp() {
      dragStartY.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  if (!elevationRef) return null

  return (
    <div className="elevation-panel" style={{ height: panelHeight }}>
      {/* Drag handle */}
      <div className="elevation-resize-handle" onMouseDown={onHandleMouseDown} title="Drag to resize" />

      <div className="elevation-panel-header">
        <span className="elevation-panel-title">Wall Elevation</span>

        {selectedElevationItem ? (
          <div className="elevation-z-editor">
            <span className="elevation-z-label">
              {selectedElevationItem.type.replace(/-/g, ' ')} — Z:
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
            <button
              className="btn-cabinet"
              style={{ marginLeft: 8 }}
              onClick={() => handleSelectFurniture(null)}
            >
              Done
            </button>
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
