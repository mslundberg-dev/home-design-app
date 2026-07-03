import { Group, Rect, Text } from 'react-konva'

interface DimensionLabelProps {
  x: number
  y: number
  text: string
}

const CHAR_WIDTH_PX = 6.6
const LINE_HEIGHT_PX = 15
const PADDING_X = 5
const PADDING_Y = 3

export function DimensionLabel({ x, y, text }: DimensionLabelProps) {
  const lines = text.split('\n')
  const longestLine = Math.max(...lines.map((line) => line.length))
  const boxWidth = longestLine * CHAR_WIDTH_PX + PADDING_X * 2
  const boxHeight = lines.length * LINE_HEIGHT_PX + PADDING_Y * 2

  return (
    <Group x={x} y={y} offsetX={boxWidth / 2} offsetY={boxHeight / 2} listening={false}>
      <Rect width={boxWidth} height={boxHeight} fill="#ffffff" opacity={0.9} cornerRadius={3} />
      <Text
        x={0}
        y={PADDING_Y}
        width={boxWidth}
        text={text}
        fontSize={13}
        fill="#1f2937"
        align="center"
      />
    </Group>
  )
}
