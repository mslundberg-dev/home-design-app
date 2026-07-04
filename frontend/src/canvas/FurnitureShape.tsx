import { useRef } from 'react'
import { Group, Rect, Ellipse, Line, Text } from 'react-konva'
import type Konva from 'konva'
import type { FloorGeometry, Furniture } from '../types'
import { inchesToPixels, pixelsToInches, worldToScreen } from './scale'
import { useFloorStore } from '../store/floorStore'
import { useUIStore } from '../store/uiStore'
import type { SelectedItem } from '../store/uiStore'

const FILL = '#dbeafe'
const FILL_SELECTED = '#bfdbfe'
const STROKE = '#4a6fa5'
const STROKE_SELECTED = '#1d4ed8'
const TEXT_COLOR = '#1e3a5f'

interface FurnitureShapeProps {
  item: Furniture
  zoom: number
  pan: { x: number; y: number }
}

export function FurnitureShape({ item, zoom, pan }: FurnitureShapeProps) {
  const beginCheckpoint = useFloorStore((s) => s.beginCheckpoint)
  const commitCheckpoint = useFloorStore((s) => s.commitCheckpoint)
  const moveFurnitureLive = useFloorStore((s) => s.moveFurnitureLive)
  const activeTool = useUIStore((s) => s.activeTool)
  const selectedItem = useUIStore((s) => s.selectedItem)
  const setSelectedItem = useUIStore((s) => s.setSelectedItem)

  const dragCheckpoint = useRef<FloorGeometry | null>(null)

  const isSelected =
    activeTool === 'select' &&
    selectedItem?.type === 'furniture' &&
    (selectedItem as Extract<SelectedItem, { type: 'furniture' }>).furnitureId === item.id

  // Group is positioned at world-center converted to screen.
  // offsetX/offsetY makes it rotate around its center.
  const center = worldToScreen({ x: item.x, y: item.y }, zoom, pan)
  const wPx = inchesToPixels(item.width, zoom)
  const hPx = inchesToPixels(item.height, zoom)

  const fill = isSelected ? FILL_SELECTED : FILL
  const stroke = isSelected ? STROKE_SELECTED : STROKE
  const sw = isSelected ? 2 : 1.5

  function handleDragStart() {
    dragCheckpoint.current = beginCheckpoint()
  }

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    // e.target.x() is the group's x in stage space (= screen center x)
    const newX = pixelsToInches(e.target.x() - pan.x, zoom)
    const newY = pixelsToInches(e.target.y() - pan.y, zoom)
    moveFurnitureLive(item.id, newX, newY)
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const newX = pixelsToInches(e.target.x() - pan.x, zoom)
    const newY = pixelsToInches(e.target.y() - pan.y, zoom)
    moveFurnitureLive(item.id, newX, newY)
    // Reset to correct position (store already updated)
    e.target.position({ x: center.x, y: center.y })
    if (dragCheckpoint.current) commitCheckpoint(dragCheckpoint.current)
    dragCheckpoint.current = null
  }

  function handleClick(e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    if (activeTool === 'select') {
      setSelectedItem({ type: 'furniture', furnitureId: item.id })
    }
  }

  const detail = renderDetail(item.type, wPx, hPx, stroke)
  const fontSize = Math.max(8, Math.min(11, wPx / 7))
  const label = furnitureLabel(item.type)

  return (
    <Group
      x={center.x}
      y={center.y}
      offsetX={wPx / 2}
      offsetY={hPx / 2}
      rotation={item.rotation}
      draggable={activeTool === 'select'}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onMouseEnter={(e) => {
        if (activeTool === 'select') {
          const stage = e.target.getStage()
          if (stage) stage.container().style.cursor = 'move'
        }
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = 'default'
      }}
    >
      {/* Background rect — top-left at (0,0) relative to group (after offset, this is centered) */}
      <Rect x={0} y={0} width={wPx} height={hPx} fill={fill} stroke={stroke} strokeWidth={sw} cornerRadius={2} />
      {detail}
      {wPx > 20 && hPx > 12 && (
        <Text
          x={0} y={0}
          text={label}
          width={wPx}
          height={hPx}
          align="center"
          verticalAlign="middle"
          fontSize={fontSize}
          fill={TEXT_COLOR}
          listening={false}
        />
      )}
    </Group>
  )
}

function furnitureLabel(type: Furniture['type']): string {
  const map: Record<Furniture['type'], string> = {
    sofa: 'Sofa', armchair: 'Chair', 'dining-chair': 'Chair',
    'dining-table': 'Table', 'coffee-table': 'Coffee\nTable', desk: 'Desk', 'side-table': 'Table',
    'twin-bed': 'Twin', 'full-bed': 'Full', 'queen-bed': 'Queen', 'king-bed': 'King',
    toilet: 'Toilet', bathtub: 'Tub', shower: 'Shower', 'bathroom-sink': 'Sink',
    refrigerator: 'Fridge', range: 'Range', 'kitchen-sink': 'Sink',
    'base-cabinet': 'Base\nCab', 'upper-cabinet': 'Upper\nCab',
    'pantry-cabinet': 'Pantry', dishwasher: 'DW',
  }
  return map[type] ?? type
}

function renderDetail(type: Furniture['type'], w: number, h: number, stroke: string) {
  switch (type) {
    case 'twin-bed':
    case 'full-bed':
    case 'queen-bed':
    case 'king-bed': {
      const hbH = Math.min(h * 0.15, 14)
      return (
        <>
          <Rect x={0} y={0} width={w} height={hbH} fill={stroke} opacity={0.35} listening={false} />
          <Ellipse
            x={w / 2} y={hbH + (h - hbH) * 0.35}
            radiusX={w * 0.3} radiusY={(h - hbH) * 0.18}
            fill="white" stroke={stroke} strokeWidth={1} opacity={0.7} listening={false}
          />
        </>
      )
    }
    case 'sofa': {
      const bH = h * 0.28
      const cW = w / 3
      return (
        <>
          <Rect x={0} y={0} width={w} height={bH} fill={stroke} opacity={0.25} listening={false} />
          <Line points={[cW, bH, cW, h]} stroke={stroke} strokeWidth={1} opacity={0.4} listening={false} />
          <Line points={[cW * 2, bH, cW * 2, h]} stroke={stroke} strokeWidth={1} opacity={0.4} listening={false} />
        </>
      )
    }
    case 'armchair':
    case 'dining-chair': {
      const bH = h * 0.28
      return <Rect x={0} y={0} width={w} height={bH} fill={stroke} opacity={0.3} listening={false} />
    }
    case 'dining-table': {
      return (
        <Ellipse
          x={w / 2} y={h / 2}
          radiusX={w * 0.38} radiusY={h * 0.35}
          fill="transparent" stroke={stroke} strokeWidth={1} opacity={0.5} listening={false}
        />
      )
    }
    case 'toilet': {
      const tankH = h * 0.38
      return (
        <>
          <Rect x={w * 0.1} y={0} width={w * 0.8} height={tankH} fill={stroke} opacity={0.2} cornerRadius={2} listening={false} />
          <Ellipse
            x={w / 2} y={tankH + (h - tankH) * 0.5}
            radiusX={w * 0.42} radiusY={(h - tankH) * 0.42}
            fill="white" stroke={stroke} strokeWidth={1} listening={false}
          />
        </>
      )
    }
    case 'bathtub': {
      const pad = Math.min(w, h) * 0.12
      return (
        <Rect
          x={pad} y={pad} width={w - pad * 2} height={h - pad * 2}
          fill="white" stroke={stroke} strokeWidth={1} cornerRadius={Math.min(w, h) * 0.15} listening={false}
        />
      )
    }
    case 'shower': {
      return (
        <>
          <Line points={[0, 0, w, h]} stroke={stroke} strokeWidth={1} opacity={0.3} listening={false} />
          <Line points={[w, 0, 0, h]} stroke={stroke} strokeWidth={1} opacity={0.3} listening={false} />
        </>
      )
    }
    case 'range': {
      const cx = [w * 0.28, w * 0.72]
      const cy = [h * 0.3, h * 0.7]
      return (
        <>
          {cx.flatMap((x) => cy.map((y) => (
            <Ellipse
              key={`${x}-${y}`}
              x={x} y={y}
              radiusX={w * 0.14} radiusY={w * 0.14}
              fill="transparent" stroke={stroke} strokeWidth={1} opacity={0.5} listening={false}
            />
          )))}
        </>
      )
    }
    default:
      return null
  }
}
