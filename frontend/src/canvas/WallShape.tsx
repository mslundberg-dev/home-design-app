import { useRef } from 'react'
import { Circle, Group, Line } from 'react-konva'
import type Konva from 'konva'
import type { FloorGeometry, Wall } from '../types'
import { inchesToPixels, pixelsToInches, worldToScreen } from './scale'
import { computeSolidSegments, edgeLength } from './geometry'
import { snapPointToGrid, snapValueToGrid } from './snapping'
import { formatLength } from '../units/format'
import { DimensionLabel } from './DimensionLabel'
import { OpeningShape } from './OpeningShape'
import { useFloorStore } from '../store/floorStore'
import { useUIStore } from '../store/uiStore'
import type { SelectedItem } from '../store/uiStore'

const VERTEX_HANDLE_RADIUS = 8
const BODY_HIT_WIDTH = 20

interface WallShapeProps {
  wall: Wall
  zoom: number
  pan: { x: number; y: number }
}

export function WallShape({ wall, zoom, pan }: WallShapeProps) {
  const updateWallVertexLive = useFloorStore((s) => s.updateWallVertexLive)
  const updateWallEndpointsLive = useFloorStore((s) => s.updateWallEndpointsLive)
  const beginCheckpoint = useFloorStore((s) => s.beginCheckpoint)
  const commitCheckpoint = useFloorStore((s) => s.commitCheckpoint)
  const activeTool = useUIStore((s) => s.activeTool)
  const selectedItem = useUIStore((s) => s.selectedItem)
  const setSelectedItem = useUIStore((s) => s.setSelectedItem)
  const unitDisplay = useUIStore((s) => s.unitDisplay)
  const gridSizeInches = useUIStore((s) => s.gridSizeInches)
  const snapToGridEnabled = useUIStore((s) => s.snapToGridEnabled)

  const bodyDragOrigin = useRef<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null)
  const dragCheckpoint = useRef<FloorGeometry | null>(null)

  const isSelected =
    activeTool === 'select' &&
    selectedItem?.type === 'wall' &&
    (selectedItem as Extract<SelectedItem, { type: 'wall' }>).wallId === wall.id

  const toScreen = (pt: { x: number; y: number }) => worldToScreen(pt, zoom, pan)

  const s1 = toScreen(wall.start)
  const s2 = toScreen(wall.end)
  const wallLenInches = edgeLength(wall.start, wall.end)

  // Wall direction unit vector in screen space
  const wallDxPx = s2.x - s1.x
  const wallDyPx = s2.y - s1.y
  const wallLenPx = Math.hypot(wallDxPx, wallDyPx) || 1
  const ux = wallDxPx / wallLenPx
  const uy = wallDyPx / wallLenPx

  const solidSegments = computeSolidSegments(wallLenInches, wall.openings)

  const stroke = isSelected ? '#2563eb' : '#374151'

  // Dimension label: offset left of wall (90° CW from direction = (uy, -ux))
  const midWorld = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 }
  const labelScreen = toScreen(midWorld)
  const LABEL_OFFSET_PX = 18
  const labelX = labelScreen.x + uy * LABEL_OFFSET_PX
  const labelY = labelScreen.y + (-ux) * LABEL_OFFSET_PX

  // ---- Drag handlers: body (move whole wall) ----
  function handleBodyDragStart() {
    dragCheckpoint.current = beginCheckpoint()
    bodyDragOrigin.current = { start: { ...wall.start }, end: { ...wall.end } }
  }

  function handleBodyDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    const origin = bodyDragOrigin.current
    if (!origin) return
    let dxIn = pixelsToInches(e.target.x(), zoom)
    let dyIn = pixelsToInches(e.target.y(), zoom)
    if (snapToGridEnabled) {
      dxIn = snapValueToGrid(dxIn, gridSizeInches)
      dyIn = snapValueToGrid(dyIn, gridSizeInches)
    }
    updateWallEndpointsLive(
      wall.id,
      { x: origin.start.x + dxIn, y: origin.start.y + dyIn },
      { x: origin.end.x + dxIn, y: origin.end.y + dyIn },
    )
    e.target.position({ x: 0, y: 0 })
  }

  function handleBodyDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    bodyDragOrigin.current = null
    e.target.position({ x: 0, y: 0 })
    if (dragCheckpoint.current) commitCheckpoint(dragCheckpoint.current)
    dragCheckpoint.current = null
  }

  // ---- Drag handlers: vertex handles (move one endpoint) ----
  function handleVertexDragStart() {
    dragCheckpoint.current = beginCheckpoint()
  }

  function handleVertexDragMove(e: Konva.KonvaEventObject<DragEvent>, which: 'start' | 'end') {
    const worldPt = {
      x: pixelsToInches(e.target.x() - pan.x, zoom),
      y: pixelsToInches(e.target.y() - pan.y, zoom),
    }
    const finalPt = snapToGridEnabled ? snapPointToGrid(worldPt, gridSizeInches) : worldPt
    updateWallVertexLive(wall.id, which, finalPt)
    const snappedScreen = toScreen(finalPt)
    e.target.position({ x: snappedScreen.x, y: snappedScreen.y })
  }

  function handleVertexDragEnd() {
    if (dragCheckpoint.current) commitCheckpoint(dragCheckpoint.current)
    dragCheckpoint.current = null
  }

  return (
    <Group>
      {/* Invisible body hit region for drag + click-to-select */}
      {activeTool === 'select' && (
        <Line
          points={[s1.x, s1.y, s2.x, s2.y]}
          stroke="transparent"
          hitStrokeWidth={BODY_HIT_WIDTH}
          draggable
          onClick={() => setSelectedItem({ type: 'wall', wallId: wall.id })}
          onMouseEnter={(e) => {
            const stage = e.target.getStage()
            if (stage) stage.container().style.cursor = 'move'
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage()
            if (stage) stage.container().style.cursor = 'default'
          }}
          onDragStart={handleBodyDragStart}
          onDragMove={handleBodyDragMove}
          onDragEnd={handleBodyDragEnd}
        />
      )}

      {/* Solid wall segments (with gaps for openings) */}
      {solidSegments.map(([a, b], idx) => {
        const aPx = inchesToPixels(a, zoom)
        const bPx = inchesToPixels(b, zoom)
        return (
          <Line
            key={idx}
            points={[s1.x + ux * aPx, s1.y + uy * aPx, s1.x + ux * bPx, s1.y + uy * bPx]}
            stroke={stroke}
            strokeWidth={3}
            lineCap="square"
            listening={false}
          />
        )
      })}

      {/* Opening glyphs */}
      {wall.openings.map((opening) => {
        const oPx = inchesToPixels(opening.offset_along_edge, zoom)
        const wPx = inchesToPixels(opening.width, zoom)
        const op1 = { x: s1.x + ux * oPx, y: s1.y + uy * oPx }
        const op2 = { x: s1.x + ux * (oPx + wPx), y: s1.y + uy * (oPx + wPx) }
        const isOpeningSelected =
          activeTool === 'select' &&
          selectedItem?.type === 'wall-opening' &&
          (selectedItem as Extract<SelectedItem, { type: 'wall-opening' }>).openingId === opening.id
        return (
          <OpeningShape
            key={opening.id}
            p1={op1}
            p2={op2}
            opening={opening}
            isSelected={isOpeningSelected}
            onClick={activeTool === 'select' ? () =>
              setSelectedItem({ type: 'wall-opening', openingId: opening.id, wallId: wall.id })
            : undefined}
          />
        )
      })}

      {/* Dimension label */}
      <DimensionLabel x={labelX} y={labelY} text={formatLength(wallLenInches, unitDisplay)} />

      {/* Vertex handles (select mode only) */}
      {activeTool === 'select' &&
        (['start', 'end'] as const).map((which) => {
          const pt = which === 'start' ? wall.start : wall.end
          const s = toScreen(pt)
          return (
            <Circle
              key={which}
              x={s.x}
              y={s.y}
              radius={VERTEX_HANDLE_RADIUS}
              fill="#ffffff"
              stroke={isSelected ? '#2563eb' : '#6b7280'}
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
              onDragMove={(e) => handleVertexDragMove(e, which)}
              onDragEnd={handleVertexDragEnd}
            />
          )
        })}
    </Group>
  )
}
