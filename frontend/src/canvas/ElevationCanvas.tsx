import { useRef, useEffect, useCallback } from 'react'
import Konva from 'konva'
import type { Furniture, Opening, FloorGeometry } from '../types'
import { FURNITURE_HEIGHTS, FURNITURE_HEIGHT_DEFAULT } from './furnitureHeights'

const PX_PER_IN = 3
const PADDING = 24
const WINDOW_SILL_IN = 36

interface WallInfo {
  lengthIn: number
  heightIn: number
  items: Furniture[]
  openings: Opening[]
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
    return {
      lengthIn: Math.hypot(v2.x - v1.x, v2.y - v1.y),
      heightIn: edge.height_inches ?? 96,
      items: geometry.furniture ?? [],
      openings: edge.openings,
    }
  } else if (elevationRef.startsWith('wall:')) {
    const wall = geometry.walls.find((w) => w.id === elevationRef.slice(5))
    if (!wall) return null
    return {
      lengthIn: Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y),
      heightIn: wall.height_inches ?? 96,
      items: geometry.furniture ?? [],
      openings: wall.openings,
    }
  }
  return null
}

interface ElevationCanvasProps {
  elevationRef: string
  geometry: FloorGeometry
  onUpdateFurniture: (item: Furniture) => void
  onSelectFurniture: (item: Furniture | null) => void
  selectedFurnitureId: string | null
}

export function ElevationCanvas({
  elevationRef,
  geometry,
  onUpdateFurniture,
  onSelectFurniture,
  selectedFurnitureId,
}: ElevationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)

  const rebuild = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const info = getWallInfo(elevationRef, geometry)
    if (!info) return

    const canvasW = Math.max(info.lengthIn * PX_PER_IN + PADDING * 2, 300)
    const canvasH = info.heightIn * PX_PER_IN + PADDING * 2

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

    // Deselect on background click
    stage.on('click', (e) => {
      if (e.target === stage) onSelectFurniture(null)
    })

    // Floor line
    layer.add(new Konva.Line({
      points: [PADDING, canvasH - PADDING, PADDING + info.lengthIn * PX_PER_IN, canvasH - PADDING],
      stroke: '#555', strokeWidth: 2,
    }))

    // Ceiling dashed line
    layer.add(new Konva.Line({
      points: [PADDING, PADDING, PADDING + info.lengthIn * PX_PER_IN, PADDING],
      stroke: '#aaa', strokeWidth: 1, dash: [4, 4],
    }))

    // Height label
    layer.add(new Konva.Text({
      x: 2, y: PADDING, text: `${(info.heightIn / 12).toFixed(0)}'`, fontSize: 10, fill: '#888',
    }))

    // Foot grid lines
    for (let ft = 0; ft * 12 <= info.lengthIn; ft++) {
      const x = PADDING + ft * 12 * PX_PER_IN
      layer.add(new Konva.Line({
        points: [x, PADDING, x, canvasH - PADDING],
        stroke: '#e5e7eb', strokeWidth: 1,
      }))
      if (ft > 0) {
        layer.add(new Konva.Text({
          x: x - 8, y: canvasH - PADDING + 4,
          text: `${ft}'`, fontSize: 9, fill: '#bbb',
        }))
      }
    }

    // ── Openings (doors and windows on this wall) ─────────────────────────────
    for (const op of info.openings) {
      const ox = PADDING + op.offset_along_edge * PX_PER_IN
      const ow = op.width * PX_PER_IN

      if (op.type === 'door') {
        const oh = op.height * PX_PER_IN
        const oy = canvasH - PADDING - oh
        // Door gap — light fill
        layer.add(new Konva.Rect({
          x: ox, y: oy, width: ow, height: oh,
          fill: '#dbeafe', stroke: '#3b82f6', strokeWidth: 1,
          listening: false,
        }))
        layer.add(new Konva.Text({
          x: ox + 2, y: oy + 2,
          text: `Door\n${op.width}"`,
          fontSize: 8, fill: '#1d4ed8', listening: false,
        }))
      } else {
        // Window: sill to sill+height
        const sillPx = WINDOW_SILL_IN * PX_PER_IN
        const oh = op.height * PX_PER_IN
        const oy = canvasH - PADDING - sillPx - oh
        layer.add(new Konva.Rect({
          x: ox, y: oy, width: ow, height: oh,
          fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 1,
          listening: false,
        }))
        // Sill indicator
        layer.add(new Konva.Line({
          points: [ox, canvasH - PADDING - sillPx, ox + ow, canvasH - PADDING - sillPx],
          stroke: '#0284c7', strokeWidth: 1, dash: [3, 3], listening: false,
        }))
        layer.add(new Konva.Text({
          x: ox + 2, y: oy + 2,
          text: `Win\n${op.width}"`,
          fontSize: 8, fill: '#0369a1', listening: false,
        }))
      }
    }

    // ── Furniture items ────────────────────────────────────────────────────────
    for (const item of info.items) {
      const def = FURNITURE_HEIGHTS[item.type] ?? FURNITURE_HEIGHT_DEFAULT
      const itemH = def.heightIn
      const zBase = item.z_elevation ?? 0
      const isSelected = item.id === selectedFurnitureId

      const px = PADDING + item.x * PX_PER_IN
      const pw = item.width * PX_PER_IN
      const ph = itemH * PX_PER_IN
      const py = canvasH - PADDING - (zBase + itemH) * PX_PER_IN

      const color = `#${def.color.toString(16).padStart(6, '0')}`

      const rect = new Konva.Rect({
        x: px, y: py, width: pw, height: ph,
        fill: color,
        stroke: isSelected ? '#1d4ed8' : '#555',
        strokeWidth: isSelected ? 2 : 1,
        cornerRadius: 2,
        draggable: true,
      })

      rect.on('click', (e) => {
        e.cancelBubble = true
        onSelectFurniture(item)
      })

      rect.on('dragend', () => {
        const newOffsetIn = (rect.x() - PADDING) / PX_PER_IN
        const newZBase = (canvasH - PADDING - rect.y()) / PX_PER_IN - itemH
        onUpdateFurniture({
          ...item,
          x: Math.round(newOffsetIn / 0.5) * 0.5,
          z_elevation: Math.max(0, Math.round(newZBase / 0.5) * 0.5),
        })
      })

      layer.add(rect)

      layer.add(new Konva.Text({
        x: px + 2, y: py + 2,
        text: item.type.replace(/-/g, ' '),
        fontSize: 9, fill: '#333', listening: false,
      }))

      layer.add(new Konva.Text({
        x: px + 2, y: py + ph - 12,
        text: `z=${zBase}"`,
        fontSize: 8, fill: isSelected ? '#1d4ed8' : '#666', listening: false,
      }))
    }

    layer.draw()
  }, [elevationRef, geometry, onUpdateFurniture, onSelectFurniture, selectedFurnitureId])

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
      style={{ overflowX: 'auto', overflowY: 'hidden', cursor: 'default', height: '100%' }}
    />
  )
}
