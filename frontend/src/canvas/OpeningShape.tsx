import { Path, Line } from 'react-konva'
import type { Opening } from '../types'

interface OpeningShapeProps {
  /** Screen-space start of the opening (hinge side for doors). */
  p1: { x: number; y: number }
  /** Screen-space end of the opening (latch side for doors). */
  p2: { x: number; y: number }
  opening: Opening
  isSelected?: boolean
  onClick?: () => void
}

const STROKE = '#374151'
const STROKE_SELECTED = '#2563eb'
const STROKE_WIDTH = 2
const WINDOW_SASH_OFFSET = 5  // px offset each side of wall centerline for window sash lines
const HIT_WIDTH = 16           // transparent hit area width in px

export function OpeningShape({ p1, p2, opening, isSelected = false, onClick }: OpeningShapeProps) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const widthPx = Math.hypot(dx, dy)
  if (widthPx < 2) return null

  const ux = dx / widthPx
  const uy = dy / widthPx

  // Screen-space normals (y increases downward):
  //   left  = 90° CW from walking direction = (uy, -ux)
  //   right = 90° CCW from walking direction = (-uy, ux)
  const nlx = uy
  const nly = -ux
  const nrx = -uy
  const nry = ux

  const stroke = isSelected ? STROKE_SELECTED : STROKE
  const listening = onClick != null

  if (opening.type === 'door') {
    const swing = opening.swing_direction ?? 'left'
    const nx = swing === 'left' ? nlx : nrx
    const ny = swing === 'left' ? nly : nry
    // sweepFlag: left=1 (CW in SVG/screen), right=0 (CCW)
    const sweepFlag = swing === 'left' ? 1 : 0

    // Door panel end — perpendicular from hinge point p1
    const Dx = p1.x + nx * widthPx
    const Dy = p1.y + ny * widthPx

    // Hinge line + quarter-circle arc back to latch point p2
    const pathData =
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
      `L ${Dx.toFixed(2)} ${Dy.toFixed(2)} ` +
      `A ${widthPx.toFixed(2)} ${widthPx.toFixed(2)} 0 0 ${sweepFlag} ` +
      `${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`

    return (
      <>
        <Path
          data={pathData}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          fillEnabled={false}
          listening={false}
        />
        {/* Transparent hit area along the door panel line */}
        {listening && (
          <Line
            points={[p1.x, p1.y, p2.x, p2.y]}
            stroke="transparent"
            hitStrokeWidth={HIT_WIDTH}
            onClick={onClick}
            onMouseEnter={(e) => { const s = e.target.getStage(); if (s) s.container().style.cursor = 'pointer' }}
            onMouseLeave={(e) => { const s = e.target.getStage(); if (s) s.container().style.cursor = 'default' }}
          />
        )}
      </>
    )
  }

  // Window: two sash lines parallel to the wall, plus jamb lines at each end
  const s = WINDOW_SASH_OFFSET
  return (
    <>
      {/* Sash line — left side */}
      <Line
        points={[p1.x + nlx * s, p1.y + nly * s, p2.x + nlx * s, p2.y + nly * s]}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        listening={false}
      />
      {/* Sash line — right side */}
      <Line
        points={[p1.x + nrx * s, p1.y + nry * s, p2.x + nrx * s, p2.y + nry * s]}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        listening={false}
      />
      {/* Jamb at p1 */}
      <Line
        points={[p1.x + nlx * s, p1.y + nly * s, p1.x + nrx * s, p1.y + nry * s]}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        listening={false}
      />
      {/* Jamb at p2 */}
      <Line
        points={[p2.x + nlx * s, p2.y + nly * s, p2.x + nrx * s, p2.y + nry * s]}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        listening={false}
      />
      {/* Transparent hit area along opening span */}
      {listening && (
        <Line
          points={[p1.x, p1.y, p2.x, p2.y]}
          stroke="transparent"
          hitStrokeWidth={HIT_WIDTH}
          onClick={onClick}
          onMouseEnter={(e) => { const s = e.target.getStage(); if (s) s.container().style.cursor = 'pointer' }}
          onMouseLeave={(e) => { const s = e.target.getStage(); if (s) s.container().style.cursor = 'default' }}
        />
      )}
    </>
  )
}
