import { useUIStore, MIN_ZOOM, MAX_ZOOM } from '../store/uiStore'
import { useFloorStore } from '../store/floorStore'
import { STAGE_WIDTH, STAGE_HEIGHT, computeFitZoomAndPan } from '../canvas/fitView'
import { computeZoomAroundPoint } from '../canvas/scale'

const ZOOM_STEP = 1.2

export function Toolbar() {
  const activeTool = useUIStore((s) => s.activeTool)
  const setActiveTool = useUIStore((s) => s.setActiveTool)
  const snapToGridEnabled = useUIStore((s) => s.snapToGridEnabled)
  const snapToAngleEnabled = useUIStore((s) => s.snapToAngleEnabled)
  const toggleSnapToGrid = useUIStore((s) => s.toggleSnapToGrid)
  const toggleSnapToAngle = useUIStore((s) => s.toggleSnapToAngle)
  const zoom = useUIStore((s) => s.zoom)
  const pan = useUIStore((s) => s.pan)
  const setZoom = useUIStore((s) => s.setZoom)
  const setPan = useUIStore((s) => s.setPan)
  const undo = useFloorStore((s) => s.undo)
  const redo = useFloorStore((s) => s.redo)
  const geometry = useFloorStore((s) => s.geometry)

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

  return (
    <div className="toolbar">
      <button className={activeTool === 'select' ? 'active' : ''} onClick={() => setActiveTool('select')}>
        Select
      </button>
      <button className={activeTool === 'draw-room' ? 'active' : ''} onClick={() => setActiveTool('draw-room')}>
        Draw Room
      </button>
      <span className="toolbar-sep" />
      <label>
        <input type="checkbox" checked={snapToGridEnabled} onChange={toggleSnapToGrid} /> Snap to grid
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
      <button onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label="Zoom out">
        −
      </button>
      <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
      <button onClick={() => zoomBy(ZOOM_STEP)} aria-label="Zoom in">
        +
      </button>
    </div>
  )
}
