import { useState, useEffect } from 'react'
import { useFloorStore } from '../store/floorStore'
import { useUIStore } from '../store/uiStore'
import { edgeLength } from '../canvas/geometry'
import { formatLength } from '../units/format'
import { parseLengthInput } from '../units/format'
import type { Opening, OpeningType } from '../types'
import type { OpeningTarget } from '../store/floorStore'

const DEFAULT_DOOR_WIDTH_IN = 36   // 3 ft
const DEFAULT_WINDOW_WIDTH_IN = 36  // 3 ft

export function PropertiesPanel() {
  const selectedItem = useUIStore((s) => s.selectedItem)
  const geometry = useFloorStore((s) => s.geometry)
  const addOpening = useFloorStore((s) => s.addOpening)
  const unitDisplay = useUIStore((s) => s.unitDisplay)

  if (!selectedItem) return null

  let openings: Opening[] = []
  let wallLengthInches = 0
  let target: OpeningTarget
  let label = ''

  if (selectedItem.type === 'room-edge') {
    const room = geometry.rooms.find((r) => r.id === selectedItem.roomId)
    const edge = room?.edges.find((e) => e.id === selectedItem.edgeId)
    if (!room || !edge) return null
    const v1 = room.vertices[edge.start_vertex_index]
    const v2 = room.vertices[edge.end_vertex_index]
    wallLengthInches = edgeLength(v1, v2)
    openings = edge.openings
    target = { roomId: selectedItem.roomId, edgeId: selectedItem.edgeId }
    label = `${room.name} — Wall`
  } else {
    const wall = geometry.walls.find((w) => w.id === selectedItem.wallId)
    if (!wall) return null
    wallLengthInches = edgeLength(wall.start, wall.end)
    openings = wall.openings
    target = { wallId: selectedItem.wallId }
    label = 'Interior Wall'
  }

  function handleAddOpening(type: OpeningType) {
    const defaultWidth = type === 'door' ? DEFAULT_DOOR_WIDTH_IN : DEFAULT_WINDOW_WIDTH_IN
    if (defaultWidth > wallLengthInches) return
    const offset = Math.max(0, (wallLengthInches - defaultWidth) / 2)
    const opening: Opening = {
      id: crypto.randomUUID(),
      type,
      offset_along_edge: offset,
      width: defaultWidth,
      height: type === 'door' ? 80 : 48,
      swing_direction: type === 'door' ? 'left' : null,
    }
    addOpening(target, opening)
  }

  return (
    <div className="properties-panel">
      <div className="prop-header">{label}</div>
      <div className="prop-row">
        <span className="prop-label">Length</span>
        <span className="prop-value">{formatLength(wallLengthInches, unitDisplay)}</span>
      </div>

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
          disabled={DEFAULT_DOOR_WIDTH_IN > wallLengthInches}
          title={DEFAULT_DOOR_WIDTH_IN > wallLengthInches ? 'Wall too short for a door' : undefined}
        >
          + Door
        </button>
        <button
          onClick={() => handleAddOpening('window')}
          disabled={DEFAULT_WINDOW_WIDTH_IN > wallLengthInches}
          title={DEFAULT_WINDOW_WIDTH_IN > wallLengthInches ? 'Wall too short for a window' : undefined}
        >
          + Window
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Opening row — individual opening editor
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

  const [widthInput, setWidthInput] = useState(formatLength(opening.width, unitDisplay))
  const [offsetInput, setOffsetInput] = useState(formatLength(opening.offset_along_edge, unitDisplay))
  const [error, setError] = useState<string | null>(null)

  // Keep inputs in sync when store updates (e.g. after undo)
  useEffect(() => {
    setWidthInput(formatLength(opening.width, unitDisplay))
    setOffsetInput(formatLength(opening.offset_along_edge, unitDisplay))
  }, [opening.width, opening.offset_along_edge, unitDisplay])

  function commitWidth() {
    const val = parseLengthInput(widthInput, unitDisplay)
    if (val === null || val <= 0) {
      setError('Invalid width')
      return
    }
    if (opening.offset_along_edge + val > wallLengthInches + 0.01) {
      setError('Opening extends beyond wall')
      return
    }
    setError(null)
    updateOpening(target, { ...opening, width: val })
  }

  function commitOffset() {
    const val = parseLengthInput(offsetInput, unitDisplay)
    if (val === null || val < 0) {
      setError('Invalid offset')
      return
    }
    if (val + opening.width > wallLengthInches + 0.01) {
      setError('Opening extends beyond wall')
      return
    }
    setError(null)
    updateOpening(target, { ...opening, offset_along_edge: val })
  }

  function toggleSwing() {
    updateOpening(target, {
      ...opening,
      swing_direction: opening.swing_direction === 'left' ? 'right' : 'left',
    })
  }

  return (
    <div className="opening-row">
      <div className="opening-row-header">
        <span className="opening-type-badge">{opening.type === 'door' ? 'Door' : 'Window'}</span>
        <button className="opening-remove" onClick={() => removeOpening(target, opening.id)} title="Remove">
          ×
        </button>
      </div>

      <div className="opening-fields">
        <label className="opening-field">
          <span>Width</span>
          <input
            value={widthInput}
            onChange={(e) => setWidthInput(e.target.value)}
            onBlur={commitWidth}
            onKeyDown={(e) => e.key === 'Enter' && commitWidth()}
          />
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
