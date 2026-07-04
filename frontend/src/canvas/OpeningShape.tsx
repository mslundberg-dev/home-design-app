import { Path, Line, Rect } from 'react-konva'
import type { Opening } from '../types'

interface OpeningShapeProps {
  p1: { x: number; y: number }
  p2: { x: number; y: number }
  opening: Opening
  isSelected?: boolean
  onClick?: () => void
}

const STROKE_DEFAULT = '#374151'
const STROKE_SELECTED = '#2563eb'
const SW = 2
const SASH_OFF = 5   // window sash offset from wall centerline
const HIT_W = 16

export function OpeningShape({ p1, p2, opening, isSelected = false, onClick }: OpeningShapeProps) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const wPx = Math.hypot(dx, dy)
  if (wPx < 2) return null

  const ux = dx / wPx
  const uy = dy / wPx
  // normals: left = 90° CW, right = 90° CCW (screen y-down)
  const nlx = uy,  nly = -ux
  const nrx = -uy, nry = ux

  const stroke = isSelected ? STROKE_SELECTED : STROKE_DEFAULT
  const listening = onClick != null

  const hitLine = listening ? (
    <Line
      points={[p1.x, p1.y, p2.x, p2.y]}
      stroke="transparent"
      hitStrokeWidth={HIT_W}
      onClick={onClick}
      onMouseEnter={(e) => { const s = e.target.getStage(); if (s) s.container().style.cursor = 'pointer' }}
      onMouseLeave={(e) => { const s = e.target.getStage(); if (s) s.container().style.cursor = 'default' }}
    />
  ) : null

  // ── DOORS ──────────────────────────────────────────────────────────────────

  if (opening.type === 'door') {
    const subtype = opening.subtype ?? 'single'

    if (subtype === 'double') {
      // Two arcs meeting at the midpoint
      const mx = (p1.x + p2.x) / 2
      const my = (p1.y + p2.y) / 2
      const half = wPx / 2
      // Left leaf: hinge at p1, arc radius = half
      const lx = p1.x + nly * half   // panel end (perpendicular left from p1)
      const ly = p1.y + nly * half   // using left normal
      // Right leaf: hinge at p2, arc radius = half (mirrored swing)
      const rx = p2.x + nry * half
      const ry = p2.y + nry * half

      const leftPath =
        `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
        `L ${lx.toFixed(2)} ${ly.toFixed(2)} ` +
        `A ${half.toFixed(2)} ${half.toFixed(2)} 0 0 1 ${mx.toFixed(2)} ${my.toFixed(2)}`
      const rightPath =
        `M ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} ` +
        `L ${rx.toFixed(2)} ${ry.toFixed(2)} ` +
        `A ${half.toFixed(2)} ${half.toFixed(2)} 0 0 0 ${mx.toFixed(2)} ${my.toFixed(2)}`
      return (
        <>
          <Path data={leftPath}  stroke={stroke} strokeWidth={SW} fillEnabled={false} listening={false} />
          <Path data={rightPath} stroke={stroke} strokeWidth={SW} fillEnabled={false} listening={false} />
          {hitLine}
        </>
      )
    }

    if (subtype === 'sliding') {
      // Two overlapping rectangles (plan view of sliding panels)
      const panelW = wPx / 2
      const panelH = 8
      // Fixed panel: left half, centered on wall
      // Sliding panel: right half, offset inward slightly
      const off = 3
      return (
        <>
          {/* Fixed panel */}
          <Rect
            x={p1.x} y={p1.y - panelH / 2}
            width={panelW} height={panelH}
            stroke={stroke} strokeWidth={SW} fillEnabled={false} listening={false}
            rotation={Math.atan2(dy, dx) * (180 / Math.PI)}
            offsetX={0} offsetY={panelH / 2}
          />
          {/* Sliding panel — offset perpendicular by `off` px */}
          <Line
            points={[
              p1.x + ux * (panelW - off) + nlx * off, p1.y + uy * (panelW - off) + nly * off,
              p2.x + nlx * off,                        p2.y + nly * off,
            ]}
            stroke={stroke} strokeWidth={SW} listening={false}
          />
          <Line
            points={[
              p1.x + ux * (panelW - off) + nlx * (off + panelH), p1.y + uy * (panelW - off) + nly * (off + panelH),
              p2.x + nlx * (off + panelH),                        p2.y + nly * (off + panelH),
            ]}
            stroke={stroke} strokeWidth={SW} listening={false}
          />
          {/* Jambs */}
          <Line points={[p1.x, p1.y, p1.x + nlx * panelH, p1.y + nly * panelH]}
            stroke={stroke} strokeWidth={SW} listening={false} />
          <Line points={[p2.x, p2.y, p2.x + nlx * panelH, p2.y + nly * panelH]}
            stroke={stroke} strokeWidth={SW} listening={false} />
          {hitLine}
        </>
      )
    }

    if (subtype === 'pocket') {
      // Dashed line with arrows indicating the door pockets into the wall
      return (
        <>
          <Line
            points={[p1.x, p1.y, p2.x, p2.y]}
            stroke={stroke} strokeWidth={SW} dash={[8, 4]} listening={false}
          />
          {/* Arrow tip at center pointing toward p2 */}
          {(() => {
            const mx = (p1.x + p2.x) / 2
            const my = (p1.y + p2.y) / 2
            const aLen = 8
            const a1x = mx - ux * aLen + nlx * aLen / 2
            const a1y = my - uy * aLen + nly * aLen / 2
            const a2x = mx - ux * aLen + nrx * aLen / 2
            const a2y = my - uy * aLen + nry * aLen / 2
            return (
              <Line points={[a1x, a1y, mx, my, a2x, a2y]}
                stroke={stroke} strokeWidth={SW} listening={false} />
            )
          })()}
          {hitLine}
        </>
      )
    }

    if (subtype === 'bifold') {
      // Two V-shaped folded panels from each jamb meeting at center
      const mx = (p1.x + p2.x) / 2
      const my = (p1.y + p2.y) / 2
      const half = wPx / 2
      const foldDepth = half * 0.6  // how far panels fold out
      // Left leaf: hinge at p1, fold point partway, arc to center
      const lFoldX = p1.x + ux * (half / 2) + nlx * foldDepth
      const lFoldY = p1.y + uy * (half / 2) + nly * foldDepth
      const rFoldX = p2.x - ux * (half / 2) + nrx * foldDepth
      const rFoldY = p2.y - uy * (half / 2) + nry * foldDepth
      return (
        <>
          <Line points={[p1.x, p1.y, lFoldX, lFoldY, mx, my]}
            stroke={stroke} strokeWidth={SW} listening={false} />
          <Line points={[p2.x, p2.y, rFoldX, rFoldY, mx, my]}
            stroke={stroke} strokeWidth={SW} listening={false} />
          {hitLine}
        </>
      )
    }

    if (subtype === 'garage') {
      // Horizontal panel lines across the opening width
      const panelH = Math.min(wPx / 4, 12)
      const lines = []
      for (let i = 1; i <= 3; i++) {
        const t = i / 4
        const lx = p1.x + ux * wPx * t
        const ly = p1.y + uy * wPx * t
        lines.push(
          <Line key={i}
            points={[lx + nlx * panelH, ly + nly * panelH, lx + nrx * panelH, ly + nry * panelH]}
            stroke={stroke} strokeWidth={1} listening={false} />
        )
      }
      return (
        <>
          {/* Outer frame */}
          <Line points={[p1.x, p1.y, p2.x, p2.y]} stroke={stroke} strokeWidth={SW} listening={false} />
          <Line points={[p1.x + nlx * panelH, p1.y + nly * panelH, p2.x + nlx * panelH, p2.y + nly * panelH]}
            stroke={stroke} strokeWidth={SW} listening={false} />
          <Line points={[p1.x + nrx * panelH, p1.y + nry * panelH, p2.x + nrx * panelH, p2.y + nry * panelH]}
            stroke={stroke} strokeWidth={SW} listening={false} />
          {lines}
          {hitLine}
        </>
      )
    }

    // Default: single hinged door (arc)
    const swing = opening.swing_direction ?? 'left'
    const nx = swing === 'left' ? nlx : nrx
    const ny = swing === 'left' ? nly : nry
    const sweepFlag = swing === 'left' ? 1 : 0
    const Dx = p1.x + nx * wPx
    const Dy = p1.y + ny * wPx
    const pathData =
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
      `L ${Dx.toFixed(2)} ${Dy.toFixed(2)} ` +
      `A ${wPx.toFixed(2)} ${wPx.toFixed(2)} 0 0 ${sweepFlag} ` +
      `${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    return (
      <>
        <Path data={pathData} stroke={stroke} strokeWidth={SW} fillEnabled={false} listening={false} />
        {hitLine}
      </>
    )
  }

  // ── WINDOWS ────────────────────────────────────────────────────────────────

  const subtype = opening.subtype ?? 'single-hung'

  if (subtype === 'casement') {
    // Frame lines at jambs + arc on one side (opens outward from left jamb)
    const arcEnd = { x: p1.x + nlx * wPx, y: p1.y + nly * wPx }
    const pathData =
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
      `L ${arcEnd.x.toFixed(2)} ${arcEnd.y.toFixed(2)} ` +
      `A ${wPx.toFixed(2)} ${wPx.toFixed(2)} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    return (
      <>
        {/* Jamb lines */}
        <Line points={[p1.x + nlx * SASH_OFF, p1.y + nly * SASH_OFF, p1.x + nrx * SASH_OFF, p1.y + nry * SASH_OFF]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        <Line points={[p2.x + nlx * SASH_OFF, p2.y + nly * SASH_OFF, p2.x + nrx * SASH_OFF, p2.y + nry * SASH_OFF]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        <Path data={pathData} stroke={stroke} strokeWidth={1} fillEnabled={false} dash={[4, 3]} listening={false} />
        {hitLine}
      </>
    )
  }

  if (subtype === 'sliding') {
    // Two sash lines with a gap/overlap indicator at center
    const mx = (p1.x + p2.x) / 2
    const my = (p1.y + p2.y) / 2
    const s = SASH_OFF
    return (
      <>
        {/* Left sash */}
        <Line points={[p1.x + nlx * s, p1.y + nly * s, mx + nlx * s, my + nly * s]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        <Line points={[p1.x + nrx * s, p1.y + nry * s, mx + nrx * s, my + nry * s]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        {/* Right sash — offset slightly to show overlap */}
        <Line points={[mx + nlx * (s - 2), my + nly * (s - 2), p2.x + nlx * (s - 2), p2.y + nly * (s - 2)]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        <Line points={[mx + nrx * (s - 2), my + nry * (s - 2), p2.x + nrx * (s - 2), p2.y + nry * (s - 2)]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        {/* Jambs */}
        <Line points={[p1.x + nlx * s, p1.y + nly * s, p1.x + nrx * s, p1.y + nry * s]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        <Line points={[p2.x + nlx * s, p2.y + nly * s, p2.x + nrx * s, p2.y + nry * s]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        {hitLine}
      </>
    )
  }

  if (subtype === 'fixed') {
    // Single thick line — no operable sash
    return (
      <>
        <Line points={[p1.x, p1.y, p2.x, p2.y]} stroke={stroke} strokeWidth={SW + 1} listening={false} />
        <Line points={[p1.x + nlx * SASH_OFF, p1.y + nly * SASH_OFF, p1.x + nrx * SASH_OFF, p1.y + nry * SASH_OFF]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        <Line points={[p2.x + nlx * SASH_OFF, p2.y + nly * SASH_OFF, p2.x + nrx * SASH_OFF, p2.y + nry * SASH_OFF]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        {hitLine}
      </>
    )
  }

  if (subtype === 'awning') {
    // Frame + dashed arc at bottom (hinge at top, swings outward from bottom)
    const arcEnd = { x: p1.x + nrx * wPx, y: p1.y + nry * wPx }
    const pathData =
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
      `L ${arcEnd.x.toFixed(2)} ${arcEnd.y.toFixed(2)} ` +
      `A ${wPx.toFixed(2)} ${wPx.toFixed(2)} 0 0 0 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    return (
      <>
        <Line points={[p1.x + nlx * SASH_OFF, p1.y + nly * SASH_OFF, p2.x + nlx * SASH_OFF, p2.y + nly * SASH_OFF]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        <Line points={[p1.x + nrx * SASH_OFF, p1.y + nry * SASH_OFF, p2.x + nrx * SASH_OFF, p2.y + nry * SASH_OFF]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        <Line points={[p1.x + nlx * SASH_OFF, p1.y + nly * SASH_OFF, p1.x + nrx * SASH_OFF, p1.y + nry * SASH_OFF]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        <Line points={[p2.x + nlx * SASH_OFF, p2.y + nly * SASH_OFF, p2.x + nrx * SASH_OFF, p2.y + nry * SASH_OFF]}
          stroke={stroke} strokeWidth={SW} listening={false} />
        <Path data={pathData} stroke={stroke} strokeWidth={1} fillEnabled={false} dash={[4, 3]} listening={false} />
        {hitLine}
      </>
    )
  }

  // Default: single-hung / double-hung — two sash lines + jambs
  const s = SASH_OFF
  return (
    <>
      <Line points={[p1.x + nlx * s, p1.y + nly * s, p2.x + nlx * s, p2.y + nly * s]}
        stroke={stroke} strokeWidth={SW} listening={false} />
      <Line points={[p1.x + nrx * s, p1.y + nry * s, p2.x + nrx * s, p2.y + nry * s]}
        stroke={stroke} strokeWidth={SW} listening={false} />
      <Line points={[p1.x + nlx * s, p1.y + nly * s, p1.x + nrx * s, p1.y + nry * s]}
        stroke={stroke} strokeWidth={SW} listening={false} />
      <Line points={[p2.x + nlx * s, p2.y + nly * s, p2.x + nrx * s, p2.y + nry * s]}
        stroke={stroke} strokeWidth={SW} listening={false} />
      {hitLine}
    </>
  )
}
