import { Line } from 'react-konva'
import { inchesToPixels } from './scale'

interface GridProps {
  width: number
  height: number
  zoom: number
  pan: { x: number; y: number }
  gridSizeInches: number
}

export function Grid({ width, height, zoom, pan, gridSizeInches }: GridProps) {
  const stepPx = inchesToPixels(gridSizeInches, zoom)
  if (stepPx < 4) return null

  const lines = []
  const startX = pan.x % stepPx
  for (let x = startX; x < width; x += stepPx) {
    lines.push(<Line key={`v-${x}`} points={[x, 0, x, height]} stroke="#e5e7eb" strokeWidth={1} />)
  }
  const startY = pan.y % stepPx
  for (let y = startY; y < height; y += stepPx) {
    lines.push(<Line key={`h-${y}`} points={[0, y, width, y]} stroke="#e5e7eb" strokeWidth={1} />)
  }
  return <>{lines}</>
}
