import { useUIStore } from '../store/uiStore'
import { DOOR_TYPES, WINDOW_TYPES } from '../canvas/openingTypes'
import type { DoorSubtype, WindowSubtype } from '../canvas/openingTypes'

export function DoorPanel() {
  const activeTool = useUIStore((s) => s.activeTool)
  const setActiveTool = useUIStore((s) => s.setActiveTool)
  const showDoorPanel = useUIStore((s) => s.showDoorPanel)
  const setShowDoorPanel = useUIStore((s) => s.setShowDoorPanel)
  const pendingDoorSubtype = useUIStore((s) => s.pendingDoorSubtype)
  const setPendingDoorSubtype = useUIStore((s) => s.setPendingDoorSubtype)

  if (!showDoorPanel) return null

  function select(subtype: DoorSubtype) {
    setPendingDoorSubtype(subtype)
    setActiveTool('place-door')
  }

  return (
    <div className="opening-type-panel">
      <div className="opening-type-panel-header">
        <span>Door Type</span>
        <button className="opening-type-panel-close" onClick={() => setShowDoorPanel(false)}>×</button>
      </div>
      {activeTool === 'place-door' && (
        <div className="opening-type-panel-hint">Click on a wall to place</div>
      )}
      <div className="opening-type-items">
        {DOOR_TYPES.map((entry) => (
          <button
            key={entry.subtype}
            className={`opening-type-item-btn${pendingDoorSubtype === entry.subtype ? ' active' : ''}`}
            onClick={() => select(entry.subtype as DoorSubtype)}
            title={entry.description}
          >
            <span className="opening-type-icon">{doorIcon(entry.subtype as DoorSubtype)}</span>
            <span className="opening-type-label">{entry.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function WindowPanel() {
  const activeTool = useUIStore((s) => s.activeTool)
  const setActiveTool = useUIStore((s) => s.setActiveTool)
  const showWindowPanel = useUIStore((s) => s.showWindowPanel)
  const setShowWindowPanel = useUIStore((s) => s.setShowWindowPanel)
  const pendingWindowSubtype = useUIStore((s) => s.pendingWindowSubtype)
  const setPendingWindowSubtype = useUIStore((s) => s.setPendingWindowSubtype)

  if (!showWindowPanel) return null

  function select(subtype: WindowSubtype) {
    setPendingWindowSubtype(subtype)
    setActiveTool('place-window')
  }

  return (
    <div className="opening-type-panel">
      <div className="opening-type-panel-header">
        <span>Window Type</span>
        <button className="opening-type-panel-close" onClick={() => setShowWindowPanel(false)}>×</button>
      </div>
      {activeTool === 'place-window' && (
        <div className="opening-type-panel-hint">Click on a wall to place</div>
      )}
      <div className="opening-type-items">
        {WINDOW_TYPES.map((entry) => (
          <button
            key={entry.subtype}
            className={`opening-type-item-btn${pendingWindowSubtype === entry.subtype ? ' active' : ''}`}
            onClick={() => select(entry.subtype as WindowSubtype)}
            title={entry.description}
          >
            <span className="opening-type-icon">{windowIcon(entry.subtype as WindowSubtype)}</span>
            <span className="opening-type-label">{entry.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function doorIcon(subtype: DoorSubtype): string {
  switch (subtype) {
    case 'single':  return '🚪'
    case 'double':  return '🚪🚪'
    case 'sliding': return '⬛→'
    case 'pocket':  return '↔'
    case 'bifold':  return '⋀⋀'
    case 'garage':  return '🏠'
    default:        return '🚪'
  }
}

function windowIcon(subtype: WindowSubtype): string {
  switch (subtype) {
    case 'single-hung': return '▭'
    case 'casement':    return '↗'
    case 'sliding':     return '⇄'
    case 'fixed':       return '▬'
    case 'awning':      return '↙'
    default:            return '▭'
  }
}
