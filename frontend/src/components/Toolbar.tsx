import { useUIStore, MIN_ZOOM, MAX_ZOOM } from '../store/uiStore'
import { useFloorStore } from '../store/floorStore'
import { STAGE_WIDTH, STAGE_HEIGHT, computeFitZoomAndPan } from '../canvas/fitView'
import { computeZoomAroundPoint } from '../canvas/scale'
import { DOOR_WIDTHS, DOOR_HEIGHTS, WINDOW_WIDTHS, WINDOW_HEIGHTS, fmtIn } from '../canvas/openingSizes'

const ZOOM_STEP = 1.2

const IMPERIAL_GRID_OPTIONS: { value: number; label: string }[] = [
  { value: 12,       label: '1 ft'   },
  { value: 6,        label: '6 in'   },
  { value: 3,        label: '3 in'   },
  { value: 1,        label: '1 in'   },
  { value: 0.5,      label: '1/2 in' },
  { value: 0.25,     label: '1/4 in' },
  { value: 0.125,    label: '1/8 in' },
  { value: 0.0625,   label: '1/16 in'},
  { value: 0.03125,  label: '1/32 in'},
]

const METRIC_GRID_OPTIONS: { value: number; label: string }[] = [
  { value: 39.3701,  label: '1 m'   },
  { value: 19.6850,  label: '50 cm' },
  { value: 3.93701,  label: '10 cm' },
  { value: 0.393701, label: '1 cm'  },
  { value: 0.196850, label: '5 mm'  },
  { value: 0.039370, label: '1 mm'  },
]

export function Toolbar() {
  const activeTool = useUIStore((s) => s.activeTool)
  const setActiveTool = useUIStore((s) => s.setActiveTool)
  const snapToGridEnabled = useUIStore((s) => s.snapToGridEnabled)
  const snapToAngleEnabled = useUIStore((s) => s.snapToAngleEnabled)
  const toggleSnapToGrid = useUIStore((s) => s.toggleSnapToGrid)
  const toggleSnapToAngle = useUIStore((s) => s.toggleSnapToAngle)
  const gridSizeInches = useUIStore((s) => s.gridSizeInches)
  const setGridSize = useUIStore((s) => s.setGridSize)
  const unitDisplay = useUIStore((s) => s.unitDisplay)
  const zoom = useUIStore((s) => s.zoom)
  const pan = useUIStore((s) => s.pan)
  const setZoom = useUIStore((s) => s.setZoom)
  const setPan = useUIStore((s) => s.setPan)
  const showFurniturePanel = useUIStore((s) => s.showFurniturePanel)
  const setShowFurniturePanel = useUIStore((s) => s.setShowFurniturePanel)
  const showDoorPanel = useUIStore((s) => s.showDoorPanel)
  const setShowDoorPanel = useUIStore((s) => s.setShowDoorPanel)
  const showWindowPanel = useUIStore((s) => s.showWindowPanel)
  const setShowWindowPanel = useUIStore((s) => s.setShowWindowPanel)
  const pendingDoorSubtype = useUIStore((s) => s.pendingDoorSubtype)
  const pendingWindowSubtype = useUIStore((s) => s.pendingWindowSubtype)
  const pendingDoorWidth = useUIStore((s) => s.pendingDoorWidth)
  const pendingDoorHeight = useUIStore((s) => s.pendingDoorHeight)
  const pendingWindowWidth = useUIStore((s) => s.pendingWindowWidth)
  const pendingWindowHeight = useUIStore((s) => s.pendingWindowHeight)
  const setPendingDoorSize = useUIStore((s) => s.setPendingDoorSize)
  const setPendingWindowSize = useUIStore((s) => s.setPendingWindowSize)
  const undo = useFloorStore((s) => s.undo)
  const redo = useFloorStore((s) => s.redo)
  const geometry = useFloorStore((s) => s.geometry)

  const gridOptions = unitDisplay === 'metric' ? METRIC_GRID_OPTIONS : IMPERIAL_GRID_OPTIONS

  const selectedValue = gridOptions.reduce((best, opt) =>
    Math.abs(opt.value - gridSizeInches) < Math.abs(best.value - gridSizeInches) ? opt : best
  ).value

  function handleFitToView() {
    const fit = computeFitZoomAndPan(geometry, STAGE_WIDTH, STAGE_HEIGHT)
    if (fit) {
      setZoom(fit.zoom)
      setPan(fit.pan)
    }
  }

  function zoomBy(factor: number) {
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor))
    const stageCenter = { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 }
    setPan(computeZoomAroundPoint(stageCenter, zoom, pan, clampedZoom))
    setZoom(clampedZoom)
  }

  function handleFurnitureToggle() {
    const next = !showFurniturePanel
    setShowFurniturePanel(next)
    if (next && activeTool !== 'place-furniture') setActiveTool('select')
  }

  function handleDoorToggle() {
    const next = !showDoorPanel
    setShowDoorPanel(next)
    if (next) setShowWindowPanel(false)
    if (!next && activeTool === 'place-door') setActiveTool('select')
  }

  function handleWindowToggle() {
    const next = !showWindowPanel
    setShowWindowPanel(next)
    if (next) setShowDoorPanel(false)
    if (!next && activeTool === 'place-window') setActiveTool('select')
  }

  return (
    <div className="toolbar">
      <button className={activeTool === 'select' ? 'active' : ''} onClick={() => setActiveTool('select')}>
        Select
      </button>
      <span className="toolbar-sep" />
      <button className={activeTool === 'draw-room' ? 'active' : ''} onClick={() => setActiveTool('draw-room')}>
        Draw Room
      </button>
      <button className={activeTool === 'draw-wall' ? 'active' : ''} onClick={() => setActiveTool('draw-wall')}>
        Draw Wall
      </button>
      <span className="toolbar-sep" />
      <button
        className={showDoorPanel || activeTool === 'place-door' ? 'active' : ''}
        onClick={handleDoorToggle}
        title="Choose door type and click on a wall to place"
      >
        Door{pendingDoorSubtype !== 'single' ? ` · ${pendingDoorSubtype}` : ''}
      </button>
      <select
        className="opening-size-select"
        value={pendingDoorWidth}
        onChange={(e) => setPendingDoorSize(Number(e.target.value), pendingDoorHeight)}
        title="Door width"
      >
        {DOOR_WIDTHS.map((w) => <option key={w} value={w}>{fmtIn(w)}</option>)}
      </select>
      <select
        className="opening-size-select"
        value={pendingDoorHeight}
        onChange={(e) => setPendingDoorSize(pendingDoorWidth, Number(e.target.value))}
        title="Door height"
      >
        {DOOR_HEIGHTS.map((h) => <option key={h} value={h}>{fmtIn(h)}</option>)}
      </select>
      <span className="toolbar-sep" />
      <button
        className={showWindowPanel || activeTool === 'place-window' ? 'active' : ''}
        onClick={handleWindowToggle}
        title="Choose window type and click on a wall to place"
      >
        Window{pendingWindowSubtype !== 'single-hung' ? ` · ${pendingWindowSubtype}` : ''}
      </button>
      <select
        className="opening-size-select"
        value={pendingWindowWidth}
        onChange={(e) => setPendingWindowSize(Number(e.target.value), pendingWindowHeight)}
        title="Window width"
      >
        {WINDOW_WIDTHS.map((w) => <option key={w} value={w}>{fmtIn(w)}</option>)}
      </select>
      <select
        className="opening-size-select"
        value={pendingWindowHeight}
        onChange={(e) => setPendingWindowSize(pendingWindowWidth, Number(e.target.value))}
        title="Window height"
      >
        {WINDOW_HEIGHTS.map((h) => <option key={h} value={h}>{fmtIn(h)}</option>)}
      </select>
      <span className="toolbar-sep" />
      <button
        className={showFurniturePanel ? 'active' : ''}
        onClick={handleFurnitureToggle}
        title="Open furniture palette"
      >
        Furniture
      </button>
      <span className="toolbar-sep" />
      <label className="toolbar-snap-label">
        <input type="checkbox" checked={snapToGridEnabled} onChange={toggleSnapToGrid} /> Snap
        <select
          className="grid-size-select"
          value={selectedValue}
          onChange={(e) => setGridSize(Number(e.target.value))}
          title="Grid size"
        >
          {gridOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
      <label>
        <input type="checkbox" checked={snapToAngleEnabled} onChange={toggleSnapToAngle} /> Snap to 15°
      </label>
      <span className="toolbar-sep" />
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      <span className="toolbar-sep" />
      <button onClick={handleFitToView}>Fit to View</button>
      <span className="toolbar-sep" />
      <button onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label="Zoom out">−</button>
      <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
      <button onClick={() => zoomBy(ZOOM_STEP)} aria-label="Zoom in">+</button>
    </div>
  )
}
