import { useState, useEffect, useCallback, useRef } from 'react'
import { useUIStore } from '../store/uiStore'
import { useFloorStore } from '../store/floorStore'
import { ElevationCanvas } from '../canvas/ElevationCanvas'
import type { SelectedOpening } from '../canvas/ElevationCanvas'
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
  const updateOpening = useFloorStore((s) => s.updateOpening)

  const [selectedElevationItem, setSelectedElevationItem] = useState<Furniture | null>(null)
  const [selectedOpening, setSelectedOpening] = useState<SelectedOpening | null>(null)
  const [zInput, setZInput] = useState('')
  const [openingWidthInput, setOpeningWidthInput] = useState('')
  const [openingOffsetInput, setOpeningOffsetInput] = useState('')
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT)
  const dragStartY = useRef<number | null>(null)
  const dragStartHeight = useRef<number>(DEFAULT_HEIGHT)

  // Auto-switch elevation canvas when user selects a different wall (panel must already be open)
  useEffect(() => {
    if (!elevationRef || !selectedItem) return
    if (selectedItem.type === 'room-edge') {
      setElevationRef(`room:${selectedItem.roomId}:${selectedItem.edgeId}`)
    } else if (selectedItem.type === 'wall') {
      setElevationRef(`wall:${selectedItem.wallId}`)
    }
  }, [selectedItem, elevationRef, setElevationRef])

  // Keep zInput in sync with the selected furniture item when geometry changes
  useEffect(() => {
    if (!selectedElevationItem) { setZInput(''); return }
    const live = (geometry.furniture ?? []).find((f) => f.id === selectedElevationItem.id)
    if (live) {
      setSelectedElevationItem(live)
      setZInput(String(live.z_elevation ?? 0))
    }
  }, [geometry.furniture, selectedElevationItem?.id])

  // Keep opening inputs in sync when geometry changes (e.g. after drag)
  useEffect(() => {
    if (!selectedOpening) { setOpeningWidthInput(''); setOpeningOffsetInput(''); return }
    // Find the live opening from geometry
    const { target, opening } = selectedOpening
    let liveOpening = null
    if ('roomId' in target) {
      const room = geometry.rooms.find((r) => r.id === target.roomId)
      const edge = room?.edges.find((e) => e.id === target.edgeId)
      liveOpening = edge?.openings.find((o) => o.id === opening.id) ?? null
    } else {
      const wall = geometry.walls.find((w) => w.id === target.wallId)
      liveOpening = wall?.openings.find((o) => o.id === opening.id) ?? null
    }
    if (liveOpening) {
      setSelectedOpening({ ...selectedOpening, opening: liveOpening })
      setOpeningWidthInput(String(liveOpening.width))
      setOpeningOffsetInput(String(Math.round(liveOpening.offset_along_edge * 10) / 10))
    }
  }, [geometry.rooms, geometry.walls, selectedOpening?.opening.id])

  const handleSelectFurniture = useCallback((item: Furniture | null) => {
    setSelectedElevationItem(item)
    setSelectedOpening(null)
    setZInput(item ? String(item.z_elevation ?? 0) : '')
  }, [])

  const handleSelectOpening = useCallback((sel: SelectedOpening | null) => {
    setSelectedOpening(sel)
    setSelectedElevationItem(null)
    setZInput('')
    if (sel) {
      setOpeningWidthInput(String(sel.opening.width))
      setOpeningOffsetInput(String(Math.round(sel.opening.offset_along_edge * 10) / 10))
    }
  }, [])

  const handleUpdateFurniture = useCallback((item: Furniture) => {
    updateFurnitureLive(item)
    updateFurniture(item)
    setSelectedElevationItem(item)
    setZInput(String(item.z_elevation ?? 0))
  }, [updateFurnitureLive, updateFurniture])

  const handleUpdateOpening = useCallback((target: Parameters<typeof updateOpening>[0], opening: Parameters<typeof updateOpening>[1]) => {
    updateOpening(target, opening)
  }, [updateOpening])

  function commitZInput() {
    if (!selectedElevationItem) return
    const parsed = parseFloat(zInput)
    if (isNaN(parsed) || parsed < 0) return
    const updated = { ...selectedElevationItem, z_elevation: parsed }
    updateFurnitureLive(updated)
    updateFurniture(updated)
    setSelectedElevationItem(updated)
  }

  function commitOpeningWidth() {
    if (!selectedOpening) return
    const parsed = parseFloat(openingWidthInput)
    if (isNaN(parsed) || parsed <= 0) return
    updateOpening(selectedOpening.target, { ...selectedOpening.opening, width: parsed })
  }

  function commitOpeningOffset() {
    if (!selectedOpening) return
    const parsed = parseFloat(openingOffsetInput)
    if (isNaN(parsed) || parsed < 0) return
    updateOpening(selectedOpening.target, { ...selectedOpening.opening, offset_along_edge: parsed })
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
      const delta = dragStartY.current - ev.clientY
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

  const activeSelection = selectedElevationItem
    ? 'furniture'
    : selectedOpening
      ? 'opening'
      : null

  return (
    <div className="elevation-panel" style={{ height: panelHeight }}>
      {/* Drag handle */}
      <div className="elevation-resize-handle" onMouseDown={onHandleMouseDown} title="Drag to resize" />

      <div className="elevation-panel-header">
        <span className="elevation-panel-title">Wall Elevation</span>

        {activeSelection === 'furniture' && selectedElevationItem && (
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
            <button className="btn-cabinet" style={{ marginLeft: 8 }} onClick={() => handleSelectFurniture(null)}>Done</button>
          </div>
        )}

        {activeSelection === 'opening' && selectedOpening && (
          <div className="elevation-z-editor">
            <span className="elevation-z-label">
              {selectedOpening.opening.type === 'door' ? 'Door' : 'Window'} — W:
            </span>
            <input
              className="elevation-z-input"
              type="number"
              min={1}
              step={1}
              value={openingWidthInput}
              onChange={(e) => setOpeningWidthInput(e.target.value)}
              onBlur={commitOpeningWidth}
              onKeyDown={(e) => { if (e.key === 'Enter') commitOpeningWidth() }}
            />
            <span className="elevation-z-unit">in</span>
            <span className="elevation-z-label" style={{ marginLeft: 8 }}>Offset:</span>
            <input
              className="elevation-z-input"
              type="number"
              min={0}
              step={1}
              value={openingOffsetInput}
              onChange={(e) => setOpeningOffsetInput(e.target.value)}
              onBlur={commitOpeningOffset}
              onKeyDown={(e) => { if (e.key === 'Enter') commitOpeningOffset() }}
            />
            <span className="elevation-z-unit">in</span>
            <button className="btn-cabinet" style={{ marginLeft: 8 }} onClick={() => handleSelectOpening(null)}>Done</button>
          </div>
        )}

        {activeSelection === null && (
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
          onClick={() => { setElevationRef(null); setSelectedElevationItem(null); setSelectedOpening(null) }}
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
          onUpdateOpening={handleUpdateOpening}
          onSelectOpening={handleSelectOpening}
          selectedOpeningId={selectedOpening?.opening.id ?? null}
        />
      </div>
    </div>
  )
}
