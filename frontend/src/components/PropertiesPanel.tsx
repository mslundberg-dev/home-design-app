import { useState, useEffect } from 'react'
import { useFloorStore } from '../store/floorStore'
import { useUIStore } from '../store/uiStore'
import { edgeLength } from '../canvas/geometry'
import { formatLength, parseLengthInput } from '../units/format'
import type { Furniture, Opening, OpeningType } from '../types'
import type { OpeningTarget } from '../store/floorStore'
import { FURNITURE_CATALOG } from '../canvas/furnitureCatalog'
import {
  DOOR_WIDTHS, DOOR_HEIGHTS, WINDOW_WIDTHS, WINDOW_HEIGHTS, fmtIn,
  DEFAULT_DOOR_WIDTH, DEFAULT_DOOR_HEIGHT, DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT,
} from '../canvas/openingSizes'
import { DOOR_TYPES, WINDOW_TYPES } from '../canvas/openingTypes'

const MIN_WALL_LENGTH_IN = 1

export function PropertiesPanel() {
  const selectedItem = useUIStore((s) => s.selectedItem)
  const geometry = useFloorStore((s) => s.geometry)
  const addOpening = useFloorStore((s) => s.addOpening)
  const setRoomEdgeLength = useFloorStore((s) => s.setRoomEdgeLength)
  const setWallLength = useFloorStore((s) => s.setWallLength)
  const setRoomEdgeHeight = useFloorStore((s) => s.setRoomEdgeHeight)
  const setWallHeight = useFloorStore((s) => s.setWallHeight)
  const removeFurniture = useFloorStore((s) => s.removeFurniture)
  const updateFurniture = useFloorStore((s) => s.updateFurniture)
  const unitDisplay = useUIStore((s) => s.unitDisplay)
  const setElevationRef = useUIStore((s) => s.setElevationRef)

  if (!selectedItem) return null

  // ── Opening (room edge) ────────────────────────────────────────────────────
  if (selectedItem.type === 'opening') {
    const room = geometry.rooms.find((r) => r.id === selectedItem.roomId)
    const edge = room?.edges.find((e) => e.id === selectedItem.edgeId)
    const opening = edge?.openings.find((o) => o.id === selectedItem.openingId)
    if (!room || !edge || !opening) return null
    const v1 = room.vertices[edge.start_vertex_index]
    const v2 = room.vertices[edge.end_vertex_index]
    const wallLenInches = edgeLength(v1, v2)
    const target: OpeningTarget = { roomId: selectedItem.roomId, edgeId: selectedItem.edgeId }
    return (
      <OpeningPropertiesPanel
        opening={opening}
        wallLengthInches={wallLenInches}
        target={target}
        unitDisplay={unitDisplay}
      />
    )
  }

  // ── Opening (freestanding wall) ────────────────────────────────────────────
  if (selectedItem.type === 'wall-opening') {
    const wall = geometry.walls.find((w) => w.id === selectedItem.wallId)
    const opening = wall?.openings.find((o) => o.id === selectedItem.openingId)
    if (!wall || !opening) return null
    const wallLenInches = edgeLength(wall.start, wall.end)
    const target: OpeningTarget = { wallId: selectedItem.wallId }
    return (
      <OpeningPropertiesPanel
        opening={opening}
        wallLengthInches={wallLenInches}
        target={target}
        unitDisplay={unitDisplay}
      />
    )
  }

  // ── Furniture ──────────────────────────────────────────────────────────────
  if (selectedItem.type === 'furniture') {
    const item = (geometry.furniture ?? []).find(
      (f) => f.id === (selectedItem as { type: 'furniture'; furnitureId: string }).furnitureId,
    )
    if (!item) return null
    return (
      <FurniturePropertiesPanel
        item={item}
        unitDisplay={unitDisplay}
        onUpdate={updateFurniture}
        onRemove={() => removeFurniture(item.id)}
      />
    )
  }

  // ── Wall / Room edge ───────────────────────────────────────────────────────
  let openings: Opening[] = []
  let wallLengthInches = 0
  let wallHeightInches = 96
  let target: OpeningTarget
  let label = ''

  if (selectedItem.type === 'room-edge') {
    const room = geometry.rooms.find((r) => r.id === selectedItem.roomId)
    const edge = room?.edges.find((e) => e.id === selectedItem.edgeId)
    if (!room || !edge) return null
    const v1 = room.vertices[edge.start_vertex_index]
    const v2 = room.vertices[edge.end_vertex_index]
    wallLengthInches = edgeLength(v1, v2)
    wallHeightInches = edge.height_inches ?? 96
    openings = edge.openings
    target = { roomId: selectedItem.roomId, edgeId: selectedItem.edgeId }
    label = `${room.name} — Wall`
  } else {
    const wall = geometry.walls.find((w) => w.id === selectedItem.wallId)
    if (!wall) return null
    wallLengthInches = edgeLength(wall.start, wall.end)
    wallHeightInches = wall.height_inches ?? 96
    openings = wall.openings
    target = { wallId: selectedItem.wallId }
    label = 'Interior Wall'
  }

  function commitLength(newLengthInches: number) {
    if ('roomId' in target) {
      setRoomEdgeLength(target.roomId, target.edgeId, newLengthInches)
    } else {
      setWallLength(target.wallId, newLengthInches)
    }
  }

  function commitHeight(newHeightInches: number) {
    if ('roomId' in target) {
      setRoomEdgeHeight(target.roomId, target.edgeId, newHeightInches)
    } else {
      setWallHeight(target.wallId, newHeightInches)
    }
  }

  function handleAddOpening(type: OpeningType) {
    const widths = type === 'door' ? DOOR_WIDTHS : WINDOW_WIDTHS
    const defaultW = type === 'door' ? DEFAULT_DOOR_WIDTH : DEFAULT_WINDOW_WIDTH
    const defaultH = type === 'door' ? DEFAULT_DOOR_HEIGHT : DEFAULT_WINDOW_HEIGHT
    // Pick the largest standard width that fits, falling back to smallest
    const fits = [...widths].filter((w) => w <= wallLengthInches)
    const width = fits.length ? Math.min(defaultW, fits[fits.length - 1]) : widths[0]
    if (width > wallLengthInches) return
    const offset = Math.max(0, (wallLengthInches - width) / 2)
    const opening: Opening = {
      id: crypto.randomUUID(),
      type,
      subtype: type === 'door' ? 'single' : 'single-hung',
      offset_along_edge: offset,
      width,
      height: defaultH,
      swing_direction: type === 'door' ? 'left' : null,
    }
    addOpening(target, opening)
  }

  return (
    <div className="properties-panel">
      <div className="prop-header">{label}</div>
      <LengthField
        lengthInches={wallLengthInches}
        unitDisplay={unitDisplay}
        onCommit={commitLength}
      />
      <LengthField
        label="Height"
        lengthInches={wallHeightInches}
        unitDisplay={unitDisplay}
        onCommit={commitHeight}
        minInches={12}
      />

      <div className="prop-section-title">Openings</div>

      {openings.length === 0 && (
        <p className="prop-empty">No openings. Add a door or window below.</p>
      )}

      {openings.map((opening) => (
        <OpeningRow
          key={opening.id}
          opening={opening}
          wallLengthInches={wallLengthInches}
          target={target}
          unitDisplay={unitDisplay}
        />
      ))}

      <div className="prop-actions">
        <button
          onClick={() => handleAddOpening('door')}
          disabled={DOOR_WIDTHS[0] > wallLengthInches}
          title={DOOR_WIDTHS[0] > wallLengthInches ? 'Wall too short for a door' : undefined}
        >
          + Door
        </button>
        <button
          onClick={() => handleAddOpening('window')}
          disabled={WINDOW_WIDTHS[0] > wallLengthInches}
          title={WINDOW_WIDTHS[0] > wallLengthInches ? 'Wall too short for a window' : undefined}
        >
          + Window
        </button>
      </div>

      <div className="prop-actions">
        <button
          className="btn-view-elevation"
          onClick={() => {
            const ref = 'roomId' in target
              ? `room:${target.roomId}:${target.edgeId}`
              : `wall:${target.wallId}`
            setElevationRef(ref)
          }}
        >
          View Elevation ↕
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Furniture properties panel
// ---------------------------------------------------------------------------

interface FurniturePropertiesPanelProps {
  item: Furniture
  unitDisplay: 'imperial' | 'metric'
  onUpdate: (item: Furniture) => void
  onRemove: () => void
}

function FurniturePropertiesPanel({ item, unitDisplay, onUpdate, onRemove }: FurniturePropertiesPanelProps) {
  const entry = FURNITURE_CATALOG.find((e) => e.type === item.type)
  const label = entry?.label ?? item.type

  return (
    <div className="properties-panel">
      <div className="prop-header">{label}</div>

      <LengthField
        label="Width"
        lengthInches={item.width}
        unitDisplay={unitDisplay}
        onCommit={(w) => onUpdate({ ...item, width: w })}
        minInches={6}
      />
      <LengthField
        label="Depth"
        lengthInches={item.height}
        unitDisplay={unitDisplay}
        onCommit={(h) => onUpdate({ ...item, height: h })}
        minInches={6}
      />

      <div className="prop-row">
        <span className="prop-label">Rotation</span>
        <div className="prop-rotation">
          <button onClick={() => onUpdate({ ...item, rotation: (item.rotation - 15 + 360) % 360 })}>−15°</button>
          <span className="prop-rotation-val">{Math.round(item.rotation)}°</span>
          <button onClick={() => onUpdate({ ...item, rotation: (item.rotation + 15) % 360 })}>+15°</button>
        </div>
      </div>

      <div className="prop-actions">
        <button className="btn-delete" onClick={onRemove}>Delete</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Standalone opening properties panel (when an opening is selected directly)
// ---------------------------------------------------------------------------

interface OpeningPropertiesPanelProps {
  opening: Opening
  wallLengthInches: number
  target: OpeningTarget
  unitDisplay: 'imperial' | 'metric'
}

function OpeningPropertiesPanel({ opening, wallLengthInches, target, unitDisplay }: OpeningPropertiesPanelProps) {
  const removeOpening = useFloorStore((s) => s.removeOpening)
  const setSelectedItem = useUIStore((s) => s.setSelectedItem)

  const label = opening.type === 'door' ? 'Door' : 'Window'

  return (
    <div className="properties-panel">
      <div className="prop-header">{label}</div>
      <OpeningRow
        opening={opening}
        wallLengthInches={wallLengthInches}
        target={target}
        unitDisplay={unitDisplay}
      />
      <div className="prop-actions">
        <button
          className="btn-delete"
          onClick={() => {
            removeOpening(target, opening.id)
            setSelectedItem(null)
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editable length field
// ---------------------------------------------------------------------------

interface LengthFieldProps {
  label?: string
  lengthInches: number
  unitDisplay: 'imperial' | 'metric'
  onCommit: (inches: number) => void
  minInches?: number
}

function LengthField({ label = 'Length', lengthInches, unitDisplay, onCommit, minInches = MIN_WALL_LENGTH_IN }: LengthFieldProps) {
  const [input, setInput] = useState(formatLength(lengthInches, unitDisplay))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setInput(formatLength(lengthInches, unitDisplay))
    setError(null)
  }, [lengthInches, unitDisplay])

  function commit() {
    const val = parseLengthInput(input, unitDisplay)
    if (val === null || val < minInches) {
      setError(`Min is ${formatLength(minInches, unitDisplay)}`)
      setInput(formatLength(lengthInches, unitDisplay))
      setTimeout(() => setError(null), 2500)
      return
    }
    setError(null)
    if (Math.abs(val - lengthInches) > 0.001) onCommit(val)
  }

  return (
    <div className="prop-row prop-row-length">
      <span className="prop-label">{label}</span>
      <input
        className={`prop-length-input${error ? ' prop-length-input--error' : ''}`}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.currentTarget.blur() }
          if (e.key === 'Escape') { setInput(formatLength(lengthInches, unitDisplay)); setError(null) }
        }}
        title="Type a length (e.g. 10ft 6in or 3.5) and press Enter"
      />
      {error && <div className="opening-error">{error}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Opening row
// ---------------------------------------------------------------------------

interface OpeningRowProps {
  opening: Opening
  wallLengthInches: number
  target: OpeningTarget
  unitDisplay: 'imperial' | 'metric'
}

function OpeningRow({ opening, wallLengthInches, target, unitDisplay }: OpeningRowProps) {
  const updateOpening = useFloorStore((s) => s.updateOpening)
  const removeOpening = useFloorStore((s) => s.removeOpening)

  const [offsetInput, setOffsetInput] = useState(formatLength(opening.offset_along_edge, unitDisplay))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOffsetInput(formatLength(opening.offset_along_edge, unitDisplay))
  }, [opening.offset_along_edge, unitDisplay])

  const widths = opening.type === 'door' ? DOOR_WIDTHS : WINDOW_WIDTHS
  const heights = opening.type === 'door' ? DOOR_HEIGHTS : WINDOW_HEIGHTS

  function changeWidth(val: number) {
    if (opening.offset_along_edge + val > wallLengthInches + 0.01) {
      // Shift offset left to fit
      const newOffset = Math.max(0, wallLengthInches - val)
      updateOpening(target, { ...opening, width: val, offset_along_edge: newOffset })
    } else {
      updateOpening(target, { ...opening, width: val })
    }
    setError(null)
  }

  function changeHeight(val: number) {
    updateOpening(target, { ...opening, height: val })
  }

  function commitOffset() {
    const val = parseLengthInput(offsetInput, unitDisplay)
    if (val === null || val < 0) { setError('Invalid offset'); return }
    if (val + opening.width > wallLengthInches + 0.01) { setError('Opening extends beyond wall'); return }
    setError(null)
    updateOpening(target, { ...opening, offset_along_edge: val })
  }

  function toggleSwing() {
    updateOpening(target, {
      ...opening,
      swing_direction: opening.swing_direction === 'left' ? 'right' : 'left',
    })
  }

  // Find nearest standard width for display (handles legacy data)
  const nearestWidth = widths.reduce((a, b) =>
    Math.abs(b - opening.width) < Math.abs(a - opening.width) ? b : a,
  )
  const nearestHeight = heights.reduce((a, b) =>
    Math.abs(b - opening.height) < Math.abs(a - opening.height) ? b : a,
  )

  const typeOptions = opening.type === 'door' ? DOOR_TYPES : WINDOW_TYPES
  const currentSubtype = opening.subtype ?? (opening.type === 'door' ? 'single' : 'single-hung')

  function changeSubtype(val: string) {
    updateOpening(target, { ...opening, subtype: val })
  }

  return (
    <div className="opening-row">
      <div className="opening-row-header">
        <span className="opening-type-badge">{opening.type === 'door' ? 'Door' : 'Window'}</span>
        <button className="opening-remove" onClick={() => removeOpening(target, opening.id)} title="Remove">×</button>
      </div>

      <div className="opening-fields">
        <label className="opening-field">
          <span>Type</span>
          <select
            value={currentSubtype}
            onChange={(e) => changeSubtype(e.target.value)}
            className="opening-select"
          >
            {typeOptions.map((t) => (
              <option key={t.subtype} value={t.subtype}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="opening-field">
          <span>Width</span>
          <select
            value={nearestWidth}
            onChange={(e) => changeWidth(Number(e.target.value))}
            className="opening-select"
          >
            {widths.filter((w) => w <= wallLengthInches).map((w) => (
              <option key={w} value={w}>{fmtIn(w)}</option>
            ))}
          </select>
        </label>
        <label className="opening-field">
          <span>Height</span>
          <select
            value={nearestHeight}
            onChange={(e) => changeHeight(Number(e.target.value))}
            className="opening-select"
          >
            {heights.map((h) => (
              <option key={h} value={h}>{fmtIn(h)}</option>
            ))}
          </select>
        </label>
        <label className="opening-field">
          <span>Offset</span>
          <input
            value={offsetInput}
            onChange={(e) => setOffsetInput(e.target.value)}
            onBlur={commitOffset}
            onKeyDown={(e) => e.key === 'Enter' && commitOffset()}
          />
        </label>
        {opening.type === 'door' && (
          <label className="opening-field">
            <span>Swing</span>
            <button className="swing-toggle" onClick={toggleSwing}>
              {opening.swing_direction === 'left' ? 'Left' : 'Right'}
            </button>
          </label>
        )}
      </div>

      {error && <div className="opening-error">{error}</div>}
    </div>
  )
}
