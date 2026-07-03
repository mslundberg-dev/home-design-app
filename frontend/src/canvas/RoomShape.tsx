import { useRef } from 'react'
import { Circle, Group, Line } from 'react-konva'
import type Konva from 'konva'
import type { FloorGeometry, Point, Room } from '../types'
import { pixelsToInches, worldToScreen } from './scale'
import { edgeLength, polygonCentroid, shoelaceArea } from './geometry'
import { snapPointToGrid, snapValueToGrid } from './snapping'
import { formatArea, formatLength } from '../units/format'
import { DimensionLabel } from './DimensionLabel'
import { useFloorStore } from '../store/floorStore'
import { useUIStore } from '../store/uiStore'

const VERTEX_HANDLE_RADIUS = 8
const EDGE_HIT_STROKE_WIDTH = 20
// Keep the edge (wall) hit-region from reaching all the way to either
// endpoint, so it can never compete with a vertex handle's own hit region
// right at the corner — otherwise the wide 20px wall hit-strip from two
// converging edges overlaps every corner, and which one wins can be
// inconsistent depending on the exact angle/join geometry there.
const EDGE_HANDLE_INSET_PX = 16

interface RoomShapeProps {
  room: Room
  zoom: number
  pan: { x: number; y: number }
}

export function RoomShape({ room, zoom, pan }: RoomShapeProps) {
  const updateRoomVertexLive = useFloorStore((s) => s.updateRoomVertexLive)
  const updateRoomEdgeVerticesLive = useFloorStore((s) => s.updateRoomEdgeVerticesLive)
  const beginCheckpoint = useFloorStore((s) => s.beginCheckpoint)
  const commitCheckpoint = useFloorStore((s) => s.commitCheckpoint)
  const activeTool = useUIStore((s) => s.activeTool)
  const unitDisplay = useUIStore((s) => s.unitDisplay)
  const gridSizeInches = useUIStore((s) => s.gridSizeInches)
  const snapToGridEnabled = useUIStore((s) => s.snapToGridEnabled)

  const edgeDragOrigin = useRef<{ start: Point; end: Point } | null>(null)
  const dragCheckpoint = useRef<FloorGeometry | null>(null)

  const toScreen = (pt: { x: number; y: number }) => worldToScreen(pt, zoom, pan)

  const screenPoints = room.vertices.flatMap((v) => {
    const s = toScreen(v)
    return [s.x, s.y]
  })

  const area = shoelaceArea(room.vertices)
  const roomCentroid = polygonCentroid(room.vertices)
  const centroidScreen = toScreen(roomCentroid)

  function handleVertexDragStart() {
    dragCheckpoint.current = beginCheckpoint()
  }

  function handleVertexDragMove(e: Konva.KonvaEventObject<DragEvent>, index: number) {
    const worldPt = {
      x: pixelsToInches(e.target.x() - pan.x, zoom),
      y: pixelsToInches(e.target.y() - pan.y, zoom),
    }
    const finalPt = snapToGridEnabled ? snapPointToGrid(worldPt, gridSizeInches) : worldPt
    updateRoomVertexLive(room.id, index, finalPt)
    // Konva's drag tracking follows the raw, unsnapped pointer position and
    // knows nothing about our grid snap — without this, the handle visually
    // drifts away from the snapped point it actually represents.
    const snappedScreen = toScreen(finalPt)
    e.target.position({ x: snappedScreen.x, y: snappedScreen.y })
  }

  function handleVertexDragEnd() {
    if (dragCheckpoint.current) commitCheckpoint(dragCheckpoint.current)
    dragCheckpoint.current = null
  }

  function handleEdgeDragStart(startIndex: number, endIndex: number) {
    dragCheckpoint.current = beginCheckpoint()
    edgeDragOrigin.current = { start: room.vertices[startIndex], end: room.vertices[endIndex] }
  }

  function handleEdgeDragMove(e: Konva.KonvaEventObject<DragEvent>, startIndex: number, endIndex: number) {
    const origin = edgeDragOrigin.current
    if (!origin) return
    let dxIn = pixelsToInches(e.target.x(), zoom)
    let dyIn = pixelsToInches(e.target.y(), zoom)
    if (snapToGridEnabled) {
      dxIn = snapValueToGrid(dxIn, gridSizeInches)
      dyIn = snapValueToGrid(dyIn, gridSizeInches)
    }
    updateRoomEdgeVerticesLive(
      room.id,
      startIndex,
      endIndex,
      { x: origin.start.x + dxIn, y: origin.start.y + dyIn },
      { x: origin.end.x + dxIn, y: origin.end.y + dyIn },
    )
    // This proxy line's `points` are recomputed every render from the
    // (now-updated) room vertices, which already encodes the full drag
    // displacement. Konva's own drag transform ALSO accumulates that same
    // displacement on top of `points`, so without resetting it here the
    // line's actual hit-region would drift at double the real distance.
    e.target.position({ x: 0, y: 0 })
  }

  function handleEdgeDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    edgeDragOrigin.current = null
    e.target.position({ x: 0, y: 0 })
    if (dragCheckpoint.current) commitCheckpoint(dragCheckpoint.current)
    dragCheckpoint.current = null
  }

  return (
    <Group>
      <Line points={screenPoints} closed stroke="#374151" strokeWidth={3} fill="rgba(59,130,246,0.08)" />
      {room.vertices.map((v, i) => {
        const next = room.vertices[(i + 1) % room.vertices.length]
        const length = edgeLength(v, next)
        const mid = { x: (v.x + next.x) / 2, y: (v.y + next.y) / 2 }
        // Push the label outward from the room's centroid so it sits
        // beside the wall instead of directly on top of the wall stroke.
        const outward = { x: mid.x - roomCentroid.x, y: mid.y - roomCentroid.y }
        const outwardDist = Math.hypot(outward.x, outward.y) || 1
        const labelOffsetInches = 10
        const labelPos = {
          x: mid.x + (outward.x / outwardDist) * labelOffsetInches,
          y: mid.y + (outward.y / outwardDist) * labelOffsetInches,
        }
        const labelScreen = toScreen(labelPos)
        return (
          <DimensionLabel
            key={`edge-${room.id}-${i}`}
            x={labelScreen.x}
            y={labelScreen.y}
            text={formatLength(length, unitDisplay)}
          />
        )
      })}
      <DimensionLabel
        x={centroidScreen.x}
        y={centroidScreen.y}
        text={`${room.name}\n${formatArea(area, unitDisplay)}`}
      />
      {activeTool === 'select' &&
        room.vertices.map((v, i) => {
          const next = room.vertices[(i + 1) % room.vertices.length]
          const s1 = toScreen(v)
          const s2 = toScreen(next)
          const dx = s2.x - s1.x
          const dy = s2.y - s1.y
          const edgeLenPx = Math.hypot(dx, dy) || 1
          const canInset = edgeLenPx > EDGE_HANDLE_INSET_PX * 2 + 4
          const insetX = canInset ? (dx / edgeLenPx) * EDGE_HANDLE_INSET_PX : 0
          const insetY = canInset ? (dy / edgeLenPx) * EDGE_HANDLE_INSET_PX : 0
          const p1 = { x: s1.x + insetX, y: s1.y + insetY }
          const p2 = { x: s2.x - insetX, y: s2.y - insetY }
          return (
            <Line
              key={`edge-handle-${room.id}-${i}`}
              points={[p1.x, p1.y, p2.x, p2.y]}
              stroke="transparent"
              hitStrokeWidth={EDGE_HIT_STROKE_WIDTH}
              draggable
              onMouseEnter={(e) => {
                const stage = e.target.getStage()
                if (stage) stage.container().style.cursor = 'move'
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage()
                if (stage) stage.container().style.cursor = 'default'
              }}
              onDragStart={() => handleEdgeDragStart(i, (i + 1) % room.vertices.length)}
              onDragMove={(e) => handleEdgeDragMove(e, i, (i + 1) % room.vertices.length)}
              onDragEnd={handleEdgeDragEnd}
            />
          )
        })}
      {activeTool === 'select' &&
        room.vertices.map((v, i) => {
          const s = toScreen(v)
          return (
            <Circle
              key={`handle-${room.id}-${i}`}
              x={s.x}
              y={s.y}
              radius={VERTEX_HANDLE_RADIUS}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={2}
              draggable
              onMouseEnter={(e) => {
                const stage = e.target.getStage()
                if (stage) stage.container().style.cursor = 'grab'
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage()
                if (stage) stage.container().style.cursor = 'default'
              }}
              onDragStart={handleVertexDragStart}
              onDragMove={(e) => handleVertexDragMove(e, i)}
              onDragEnd={handleVertexDragEnd}
            />
          )
        })}
    </Group>
  )
}
