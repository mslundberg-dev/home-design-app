import { useRef, useEffect, useCallback } from 'react'
import Konva from 'konva'
import type { Furniture, FloorGeometry } from '../types'
import { FURNITURE_HEIGHTS, FURNITURE_HEIGHT_DEFAULT } from './furnitureHeights'

// Pixels per inch in the elevation view
const PX_PER_IN = 3

interface ElevationCanvasProps {
  elevationRef: string          // 'room:{roomId}:{edgeId}' or 'wall:{wallId}'
  geometry: FloorGeometry
  onUpdateFurniture: (item: Furniture) => void
}

interface WallInfo {
  lengthIn: number
  heightIn: number
  // furniture items whose footprint overlaps this wall (by y position proximity)
  items: Furniture[]
}

function getWallInfo(elevationRef: string, geometry: FloorGeometry): WallInfo | null {
  if (elevationRef.startsWith('room:')) {
    const [, roomId, edgeId] = elevationRef.split(':')
    const room = geometry.rooms.find((r) => r.id === roomId)
    if (!room) return null
    const edge = room.edges.find((e) => e.id === edgeId)
    if (!edge) return null
    const v1 = room.vertices[edge.start_vertex_index]
    const v2 = room.vertices[edge.end_vertex_index]
    const lengthIn = Math.hypot(v2.x - v1.x, v2.y - v1.y)
    const heightIn = edge.height_inches ?? 96
    return { lengthIn, heightIn, items: geometry.furniture ?? [] }
  } else if (elevationRef.startsWith('wall:')) {
    const wallId = elevationRef.slice(5)
    const wall = geometry.walls.find((w) => w.id === wallId)
    if (!wall) return null
    const lengthIn = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    const heightIn = wall.height_inches ?? 96
    return { lengthIn, heightIn, items: geometry.furniture ?? [] }
  }
  return null
}

export function ElevationCanvas({ elevationRef, geometry, onUpdateFurniture }: ElevationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)

  const PADDING = 24  // px margin around the canvas content

  const rebuild = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const info = getWallInfo(elevationRef, geometry)
    if (!info) return

    const canvasW = info.lengthIn * PX_PER_IN + PADDING * 2
    const canvasH = info.heightIn * PX_PER_IN + PADDING * 2

    // Create or resize stage
    if (!stageRef.current) {
      stageRef.current = new Konva.Stage({ container, width: canvasW, height: canvasH })
    } else {
      stageRef.current.width(canvasW)
      stageRef.current.height(canvasH)
      stageRef.current.destroyChildren()
    }
    const stage = stageRef.current

    const layer = new Konva.Layer()
    stage.add(layer)

    // Floor line
    layer.add(new Konva.Line({
      points: [PADDING, canvasH - PADDING, PADDING + info.lengthIn * PX_PER_IN, canvasH - PADDING],
      stroke: '#555', strokeWidth: 2,
    }))

    // Ceiling line
    layer.add(new Konva.Line({
      points: [PADDING, PADDING, PADDING + info.lengthIn * PX_PER_IN, PADDING],
      stroke: '#aaa', strokeWidth: 1, dash: [4, 4],
    }))

    // Height label
    layer.add(new Konva.Text({
      x: 2, y: PADDING,
      text: `${(info.heightIn / 12).toFixed(1)}'`,
      fontSize: 10, fill: '#888',
    }))

    // Grid lines every 12" (1 ft)
    for (let in_ = 0; in_ <= info.lengthIn; in_ += 12) {
      const x = PADDING + in_ * PX_PER_IN
      layer.add(new Konva.Line({
        points: [x, PADDING, x, canvasH - PADDING],
        stroke: '#ddd', strokeWidth: 1,
      }))
      if (in_ > 0) {
        layer.add(new Konva.Text({
          x: x - 10, y: canvasH - PADDING + 4,
          text: `${in_ / 12}'`,
          fontSize: 9, fill: '#aaa',
        }))
      }
    }

    // Draw furniture items
    for (const item of info.items) {
      const def = FURNITURE_HEIGHTS[item.type] ?? FURNITURE_HEIGHT_DEFAULT
      const itemHeightIn = def.heightIn
      const zBase = item.z_elevation ?? 0

      // x position in elevation: use item.x as offset along wall (approximation)
      // For a real implementation this would project onto the wall vector
      const offsetIn = item.x
      const px = PADDING + offsetIn * PX_PER_IN
      const pw = item.width * PX_PER_IN
      const ph = itemHeightIn * PX_PER_IN
      // y in canvas: floor is at bottom, so invert
      const py = canvasH - PADDING - (zBase + itemHeightIn) * PX_PER_IN

      const color = `#${def.color.toString(16).padStart(6, '0')}`

      const rect = new Konva.Rect({
        x: px, y: py, width: pw, height: ph,
        fill: color, stroke: '#555', strokeWidth: 1,
        cornerRadius: 2,
        draggable: true,
      })

      const label = new Konva.Text({
        x: px + 2, y: py + 2,
        text: item.type.replace(/-/g, ' '),
        fontSize: 9, fill: '#333',
        listening: false,
      })

      // Elevation label (z)
      const zLabel = new Konva.Text({
        x: px + 2, y: py + ph - 12,
        text: `z=${zBase}"`,
        fontSize: 8, fill: '#666',
        listening: false,
      })

      rect.on('dragend', () => {
        const newPx = rect.x()
        const newPy = rect.y()
        const newOffsetIn = (newPx - PADDING) / PX_PER_IN
        const newZBase = (canvasH - PADDING - newPy) / PX_PER_IN - itemHeightIn
        const snappedZ = Math.max(0, Math.round(newZBase / 0.5) * 0.5)
        const snappedX = Math.round(newOffsetIn / 0.5) * 0.5
        onUpdateFurniture({ ...item, x: snappedX, z_elevation: snappedZ })
      })

      layer.add(rect, label, zLabel)
    }

    layer.draw()
  }, [elevationRef, geometry, onUpdateFurniture])

  useEffect(() => {
    rebuild()
    return () => {
      stageRef.current?.destroy()
      stageRef.current = null
    }
  }, [rebuild])

  return (
    <div
      ref={containerRef}
      style={{ overflowX: 'auto', overflowY: 'hidden', cursor: 'default' }}
    />
  )
}
