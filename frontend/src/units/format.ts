export type UnitDisplay = 'imperial' | 'metric'

const FRACTION_DENOMINATOR = 16

export function roundToNearestFraction(inches: number, denominator = FRACTION_DENOMINATOR): number {
  return Math.round(inches * denominator) / denominator
}

function formatFraction(frac: number, denominator = FRACTION_DENOMINATOR): string {
  if (frac < 1 / (denominator * 2)) return ''
  let num = Math.round(frac * denominator)
  let den = denominator
  while (num % 2 === 0 && den % 2 === 0 && den > 1) {
    num /= 2
    den /= 2
  }
  if (num === den) return ''
  return ` ${num}/${den}`
}

export function inchesToFeetInches(inches: number): string {
  const rounded = roundToNearestFraction(inches)
  const sign = rounded < 0 ? '-' : ''
  const abs = Math.abs(rounded)
  const feet = Math.floor(abs / 12)
  const remainder = abs - feet * 12
  const wholeInches = Math.floor(remainder)
  const fraction = formatFraction(remainder - wholeInches)
  return `${sign}${feet}'-${wholeInches}${fraction}"`
}

export function inchesToCm(inches: number): string {
  return `${(inches * 2.54).toFixed(1)} cm`
}

export function formatLength(inches: number, unit: UnitDisplay): string {
  return unit === 'imperial' ? inchesToFeetInches(inches) : inchesToCm(inches)
}

export function formatArea(squareInches: number, unit: UnitDisplay): string {
  if (unit === 'imperial') {
    return `${(squareInches / 144).toFixed(1)} sq ft`
  }
  return `${(squareInches * 0.00064516).toFixed(2)} m²`
}

function parseFractionalInches(part: string): number {
  const fracMatch = part.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (fracMatch) {
    return parseFloat(fracMatch[1]) + parseFloat(fracMatch[2]) / parseFloat(fracMatch[3])
  }
  return parseFloat(part)
}

/** Accepts "10'-6 1/2"", "10' 6"", or a plain inch number like "126.5". */
export function parseLengthInput(input: string, unit: UnitDisplay): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  if (unit === 'metric') {
    const cm = parseFloat(trimmed.replace(/cm$/i, '').trim())
    return isNaN(cm) ? null : cm / 2.54
  }

  const feetInchesMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*'\s*-?\s*(\d+(?:\s+\d+\/\d+|\.\d+)?)?\s*"?$/)
  if (feetInchesMatch) {
    const feet = parseFloat(feetInchesMatch[1])
    const inchesPart = feetInchesMatch[2] ? parseFractionalInches(feetInchesMatch[2]) : 0
    return feet * 12 + inchesPart
  }

  const plain = parseFloat(trimmed)
  return isNaN(plain) ? null : plain
}
