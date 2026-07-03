import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Circle } from 'react-konva'
import type Konva from 'konva'
import { useFloorStore } from '../store/floorStore'
import { useUIStore } from '../store/uiStore'
import { Grid } from './Grid'
import { RoomShape } from './RoomShape'
import { WallShape } from './WallShape'
import { computeZoomAroundPoint, screenToWorld, worldToScreen } from './scale'
import { snapPoint } from './snapping'
import { isCloseToFirstVertex, MIN_ROOM_VERTICES } from './tools/drawRoom'
import { STAGE_WIDTH, STAGE_HEIGHT, computeFitZoomAndPan } from './fitView'
import { MIN_ZOOM, MAX_ZOOM } from '../store/uiStore'
import type { Point, Room, Wall } from '../types'

export function FloorCanvas() {
  const geometry = useFloorStore((s) => s.geometry)
  const addRoom = useFloorStore((s) => s.addRoom)
  const addWall = useFloorStore((s) => s.addWall)
  const activeTool = useUIStore((s) => s.activeTool)
  const setActiveTool = useUIStore((s) => s.setActiveTool)
  const setSelectedItem = useUIStore((s) => s.setSelectedItem)
  const zoom = useUIStore((s) => s.zoom)
  const setZoom = useUIStore((s) => s.setZoom)
  const pan = useUIStore((s) => s.pan)
  const setPan = useUIStore((s) => s.setPan)
  const gridSizeInches = useUIStore((s) => s.gridSizeInches)
  const snapToGridEnabled = useUIStore((s) => s.snapToGridEnabled)
  const snapToAngleEnabled = useUIStore((s) => s.snapToAngleEnabled)

  const [draftVertices, setDraftVertices] = useState<Point[]>([])
  const [wallDraftStart, setWallDraftStart] = useState<Point | null>(null)
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const isPanningRef = useRef(false)
  const lastPointerRef = useRef<Point | null>(null)

  // Clear in-progress draft when switching tools
  useEffect(() => {
    setDraftVertices([])
    setWallDraftStart(null)
    setPreviewPoint(null)
  }, [activeTool])

  function commitRoom(vertices: Point[]) {
    if (vertices.length < MIN_ROOM_VERTICES) return
    const room: Room = {
      id: crypto.randomUUID(),
      name: `Room ${geometry.rooms.length + 1}`,
      vertices,
      wall_thickness_default: 6,
      edges: vertices.map((_, i) => ({
        id: crypto.randomUUID(),
        start_vertex_index: i,
        end_vertex_index: (i + 1) % vertices.length,
        thickness: 6,
        wall_type: 'exterior' as const,
        openings: [],
      })),
    }
    addRoom(room)
    setDraftVertices([])
    setPreviewPoint(null)
    setActiveTool('select')

    // Auto-fit the view so every corner of the room just drawn is guaranteed
    // to be within the visible/interactive stage area.
    const updatedGeometry = { ...geometry, rooms: [...geometry.rooms, room] }
    const fit = computeFitZoomAndPan(updatedGeometry, STAGE_WIDTH, STAGE_HEIGHT)
    if (fit) {
      setZoom(fit.zoom)
      setPan(fit.pan)
    }
  }

  function commitWall(start: Point, end: Point) {
    const wall: Wall = {
      id: crypto.randomUUID(),
      start,
      end,
      thickness: 4.5,
      wall_type: 'interior',
      openings: [],
    }
    addWall(wall)
    setWallDraftStart(null)
    setPreviewPoint(null)
    setActiveTool('select')
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDraftVertices([])
        setWallDraftStart(null)
        setPreviewPoint(null)
      } else if (e.key === 'Enter' && activeTool === 'draw-room') {
        commitRoom(draftVertices)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [draftVertices, wallDraftStart, activeTool, geometry.rooms.length])

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    if (activeTool === 'select' && e.target === stage) {
      isPanningRef.current = true
      lastPointerRef.current = stage?.getPointerPosition() ?? null
    }
  }

  function handleStageMouseUp() {
    isPanningRef.current = false
    lastPointerRef.current = null
  }

  function handleStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!pointer) return

    if (isPanningRef.current && lastPointerRef.current) {
      const dx = pointer.x - lastPointerRef.current.x
      const dy = pointer.y - lastPointerRef.current.y
      setPan({ x: pan.x + dx, y: pan.y + dy })
      lastPointerRef.current = pointer
      return
    }

    if (activeTool !== 'draw-room' && activeTool !== 'draw-wall') return
    const worldPt = screenToWorld(pointer, zoom, pan)

    if (activeTool === 'draw-room') {
      const lastVertex = draftVertices[draftVertices.length - 1] ?? null
      setPreviewPoint(snapPoint(lastVertex, worldPt, { gridEnabled: snapToGridEnabled, angleEnabled: snapToAngleEnabled, gridSizeInches }))
    } else {
      // Angle snap relative to draft start for wall drawing
      setPreviewPoint(snapPoint(wallDraftStart, worldPt, { gridEnabled: snapToGridEnabled, angleEnabled: snapToAngleEnabled, gridSizeInches }))
    }
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!pointer) return

    if (activeTool === 'select' && e.target === stage) {
      setSelectedItem(null)
      return
    }

    if (activeTool !== 'draw-room' && activeTool !== 'draw-wall') return
    const worldPt = screenToWorld(pointer, zoom, pan)

    if (activeTool === 'draw-room') {
      const lastVertex = draftVertices[draftVertices.length - 1] ?? null
      const snapped = snapPoint(lastVertex, worldPt, { gridEnabled: snapToGridEnabled, angleEnabled: snapToAngleEnabled, gridSizeInches })
      if (isCloseToFirstVertex(snapped, draftVertices)) {
        commitRoom(draftVertices)
        return
      }
      setDraftVertices([...draftVertices, snapped])
    } else {
      const snapped = snapPoint(wallDraftStart, worldPt, { gridEnabled: snapToGridEnabled, angleEnabled: snapToAngleEnabled, gridSizeInches })
      if (wallDraftStart === null) {
        setWallDraftStart(snapped)
      } else {
        commitWall(wallDraftStart, snapped)
      }
    }
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!pointer) return
    const scaleBy = 1.05
    const rawZoom = e.evt.deltaY < 0 ? zoom * scaleBy : zoom / scaleBy
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, rawZoom))
    setPan(computeZoomAroundPoint(pointer, zoom, pan, clampedZoom))
    setZoom(clampedZoom)
  }

  const draftScreenPoints = draftVertices.flatMap((v) => {
    const s = worldToScreen(v, zoom, pan)
    return [s.x, s.y]
  })
  const roomPreviewPoints =
    previewPoint && draftVertices.length > 0
      ? [...draftScreenPoints, worldToScreen(previewPoint, zoom, pan).x, worldToScreen(previewPoint, zoom, pan).y]
      : draftScreenPoints

  const wallPreviewScreen =
    wallDraftStart && previewPoint
      ? { s1: worldToScreen(wallDraftStart, zoom, pan), s2: worldToScreen(previewPoint, zoom, pan) }
      : null

  const cursor = activeTool === 'draw-room' || activeTool === 'draw-wall' ? 'crosshair' : 'default'

  return (
    <Stage
      ref={stageRef}
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      onMouseDown={handleStageMouseDown}
      onMouseUp={handleStageMouseUp}
      onMouseMove={handleStageMouseMove}
      onClick={handleStageClick}
      onWheel={handleWheel}
      style={{ background: '#ffffff', border: '1px solid #d1d5db', cursor }}
    >
      <Layer>
        <Grid width={STAGE_WIDTH} height={STAGE_HEIGHT} zoom={zoom} pan={pan} gridSizeInches={gridSizeInches} />

        {geometry.rooms.map((room) => (
          <RoomShape key={room.id} room={room} zoom={zoom} pan={pan} />
        ))}

        {geometry.walls.map((wall) => (
          <WallShape key={wall.id} wall={wall} zoom={zoom} pan={pan} />
        ))}

        {/* Draw-room preview */}
        {activeTool === 'draw-room' && draftVertices.length > 0 && (
          <Line points={roomPreviewPoints} stroke="#2563eb" strokeWidth={2} dash={[6, 4]} />
        )}
        {activeTool === 'draw-room' &&
          draftVertices.map((v, i) => {
            const s = worldToScreen(v, zoom, pan)
            return <Circle key={`draft-${i}`} x={s.x} y={s.y} radius={4} fill="#2563eb" />
          })}

        {/* Draw-wall preview */}
        {activeTool === 'draw-wall' && wallPreviewScreen && (
          <Line
            points={[wallPreviewScreen.s1.x, wallPreviewScreen.s1.y, wallPreviewScreen.s2.x, wallPreviewScreen.s2.y]}
            stroke="#2563eb"
            strokeWidth={2}
            dash={[6, 4]}
          />
        )}
        {activeTool === 'draw-wall' && wallDraftStart && (
          <Circle
            x={worldToScreen(wallDraftStart, zoom, pan).x}
            y={worldToScreen(wallDraftStart, zoom, pan).y}
            radius={4}
            fill="#2563eb"
          />
        )}
      </Layer>
    </Stage>
  )
}
