import { useRef } from 'react'
import { Circle, Group, Line } from 'react-konva'
import type Konva from 'konva'
import type { FloorGeometry, Point, Room } from '../types'
import { inchesToPixels, pixelsToInches, worldToScreen } from './scale'
import { computeSolidSegments, edgeLength, polygonCentroid, shoelaceArea } from './geometry'
import { snapPointToGrid, snapValueToGrid } from './snapping'
import { formatArea, formatLength } from '../units/format'
import { DimensionLabel } from './DimensionLabel'
import { OpeningShape } from './OpeningShape'
import { useFloorStore } from '../store/floorStore'
import { useUIStore } from '../store/uiStore'
import type { SelectedItem } from '../store/uiStore'

const VERTEX_HANDLE_RADIUS = 8
const EDGE_HIT_STROKE_WIDTH = 20
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
  const selectedItem = useUIStore((s) => s.selectedItem)
  const setSelectedItem = useUIStore((s) => s.setSelectedItem)
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
      {/* Room fill — closed polygon, no stroke (edges drawn individually below) */}
      <Line points={screenPoints} closed fill="rgba(59,130,246,0.08)" strokeEnabled={false} listening={false} />

      {/* Per-edge rendering: wall segments with opening gaps + opening glyphs */}
      {room.edges.map((edge, i) => {
        const v1 = room.vertices[edge.start_vertex_index]
        const v2 = room.vertices[edge.end_vertex_index]
        const s1 = toScreen(v1)
        const s2 = toScreen(v2)
        const edgeLenInches = edgeLength(v1, v2)

        const wallDxPx = s2.x - s1.x
        const wallDyPx = s2.y - s1.y
        const wallLenPx = Math.hypot(wallDxPx, wallDyPx) || 1
        const ux = wallDxPx / wallLenPx
        const uy = wallDyPx / wallLenPx

        const isEdgeSelected =
          activeTool === 'select' &&
          selectedItem?.type === 'room-edge' &&
          (selectedItem as Extract<SelectedItem, { type: 'room-edge' }>).roomId === room.id &&
          (selectedItem as Extract<SelectedItem, { type: 'room-edge' }>).edgeId === edge.id

        const stroke = isEdgeSelected ? '#2563eb' : '#374151'
        const solidSegments = computeSolidSegments(edgeLenInches, edge.openings)

        // Dimension label: offset outward from centroid
        const mid = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 }
        const outward = { x: mid.x - roomCentroid.x, y: mid.y - roomCentroid.y }
        const outwardDist = Math.hypot(outward.x, outward.y) || 1
        const labelOffsetInches = 10
        const labelPos = {
          x: mid.x + (outward.x / outwardDist) * labelOffsetInches,
          y: mid.y + (outward.y / outwardDist) * labelOffsetInches,
        }
        const labelScreen = toScreen(labelPos)

        // Edge drag handle with inset so it doesn't compete with vertex handles
        const edgeLenPx = wallLenPx
        const canInset = edgeLenPx > EDGE_HANDLE_INSET_PX * 2 + 4
        const insetX = canInset ? ux * EDGE_HANDLE_INSET_PX : 0
        const insetY = canInset ? uy * EDGE_HANDLE_INSET_PX : 0
        const hp1 = { x: s1.x + insetX, y: s1.y + insetY }
        const hp2 = { x: s2.x - insetX, y: s2.y - insetY }

        return (
          <Group key={`edge-${room.id}-${i}`}>
            {/* Solid wall segments */}
            {solidSegments.map(([a, b], segIdx) => {
              const aPx = inchesToPixels(a, zoom)
              const bPx = inchesToPixels(b, zoom)
              return (
                <Line
                  key={segIdx}
                  points={[s1.x + ux * aPx, s1.y + uy * aPx, s1.x + ux * bPx, s1.y + uy * bPx]}
                  stroke={stroke}
                  strokeWidth={3}
                  lineCap="square"
                  listening={false}
                />
              )
            })}

            {/* Opening glyphs */}
            {edge.openings.map((opening) => {
              const oPx = inchesToPixels(opening.offset_along_edge, zoom)
              const wPx = inchesToPixels(opening.width, zoom)
              const op1 = { x: s1.x + ux * oPx, y: s1.y + uy * oPx }
              const op2 = { x: s1.x + ux * (oPx + wPx), y: s1.y + uy * (oPx + wPx) }
              const isOpeningSelected =
                activeTool === 'select' &&
                selectedItem?.type === 'opening' &&
                (selectedItem as Extract<SelectedItem, { type: 'opening' }>).openingId === opening.id
              return (
                <OpeningShape
                  key={opening.id}
                  p1={op1}
                  p2={op2}
                  opening={opening}
                  isSelected={isOpeningSelected}
                  onClick={activeTool === 'select' ? () =>
                    setSelectedItem({ type: 'opening', openingId: opening.id, roomId: room.id, edgeId: edge.id })
                  : undefined}
                />
              )
            })}

            {/* Dimension label */}
            <DimensionLabel
              x={labelScreen.x}
              y={labelScreen.y}
              text={formatLength(edgeLenInches, unitDisplay)}
            />

            {/* Invisible edge hit region for drag + click-to-select */}
            {activeTool === 'select' && (
              <Line
                points={[hp1.x, hp1.y, hp2.x, hp2.y]}
                stroke="transparent"
                hitStrokeWidth={EDGE_HIT_STROKE_WIDTH}
                draggable
                onClick={() =>
                  setSelectedItem({ type: 'room-edge', roomId: room.id, edgeId: edge.id })
                }
                onMouseEnter={(e) => {
                  const stage = e.target.getStage()
                  if (stage) stage.container().style.cursor = 'move'
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage()
                  if (stage) stage.container().style.cursor = 'default'
                }}
                onDragStart={() =>
                  handleEdgeDragStart(edge.start_vertex_index, edge.end_vertex_index)
                }
                onDragMove={(e) =>
                  handleEdgeDragMove(e, edge.start_vertex_index, edge.end_vertex_index)
                }
                onDragEnd={handleEdgeDragEnd}
              />
            )}
          </Group>
        )
      })}

      {/* Room area label at centroid */}
      <DimensionLabel
        x={centroidScreen.x}
        y={centroidScreen.y}
        text={`${room.name}\n${formatArea(area, unitDisplay)}`}
      />

      {/* Vertex handles (select mode only) */}
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
