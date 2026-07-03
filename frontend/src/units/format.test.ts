import { describe, it, expect } from 'vitest'
import {
  roundToNearestFraction,
  inchesToFeetInches,
  inchesToCm,
  formatLength,
  formatArea,
  parseLengthInput,
} from './format'

describe('roundToNearestFraction', () => {
  it('rounds to the nearest 1/16"', () => {
    expect(roundToNearestFraction(6.0)).toBe(6.0)
    expect(roundToNearestFraction(6.0625)).toBe(6.0625)   // exactly 1/16 — unchanged
    expect(roundToNearestFraction(6.03)).toBe(6.0)        // 6.03 * 16 = 96.48 → rounds to 96 → 6.0
    expect(roundToNearestFraction(6.09)).toBeCloseTo(6.0625)  // 6.09 * 16 = 97.44 → rounds to 97 → 6.0625
  })

  it('handles whole numbers unchanged', () => {
    expect(roundToNearestFraction(12)).toBe(12)
    expect(roundToNearestFraction(0)).toBe(0)
  })
})

describe('inchesToFeetInches', () => {
  it('formats zero', () => {
    expect(inchesToFeetInches(0)).toBe("0'-0\"")
  })

  it('formats whole feet with no inches', () => {
    expect(inchesToFeetInches(12)).toBe("1'-0\"")
    expect(inchesToFeetInches(120)).toBe("10'-0\"")
  })

  it('formats feet and whole inches', () => {
    expect(inchesToFeetInches(126)).toBe("10'-6\"")
    expect(inchesToFeetInches(13)).toBe("1'-1\"")
  })

  it('formats feet, inches, and a fraction', () => {
    expect(inchesToFeetInches(126.5)).toBe("10'-6 1/2\"")
    expect(inchesToFeetInches(14.75)).toBe("1'-2 3/4\"")
  })

  it('reduces fractions to lowest terms', () => {
    // 0.25" = 4/16 → 1/4
    expect(inchesToFeetInches(12.25)).toBe("1'-0 1/4\"")
    // 0.5" = 8/16 → 1/2
    expect(inchesToFeetInches(12.5)).toBe("1'-0 1/2\"")
  })

  it('formats a pure-inch value less than 1 foot', () => {
    expect(inchesToFeetInches(6)).toBe("0'-6\"")
  })
})

describe('inchesToCm', () => {
  it('converts 1 inch to 2.54 cm', () => {
    expect(inchesToCm(1)).toBe('2.5 cm')  // 2.54 rounded to 1 decimal
  })

  it('converts 12 inches to 30.5 cm', () => {
    expect(inchesToCm(12)).toBe('30.5 cm')
  })

  it('converts 0 inches', () => {
    expect(inchesToCm(0)).toBe('0.0 cm')
  })
})

describe('formatLength', () => {
  it('delegates to inchesToFeetInches for imperial', () => {
    expect(formatLength(120, 'imperial')).toBe("10'-0\"")
  })

  it('delegates to inchesToCm for metric', () => {
    expect(formatLength(100, 'metric')).toBe('254.0 cm')
  })
})

describe('formatArea', () => {
  it('formats square feet for imperial', () => {
    // 120 sq ft = 17280 sq in
    expect(formatArea(17280, 'imperial')).toBe('120.0 sq ft')
  })

  it('formats square meters for metric', () => {
    // 1 sq in = 0.00064516 m²; 17280 sq in ≈ 11.148 m²
    const result = formatArea(17280, 'metric')
    expect(result).toMatch(/m²$/)
    const value = parseFloat(result)
    expect(value).toBeCloseTo(11.15, 1)
  })
})

describe('parseLengthInput', () => {
  it('parses feet-inches strings', () => {
    expect(parseLengthInput("10'-0\"", 'imperial')).toBe(120)
    expect(parseLengthInput("10'-6\"", 'imperial')).toBe(126)
  })

  it('parses feet-inches without trailing quote', () => {
    expect(parseLengthInput("10'-6", 'imperial')).toBe(126)
  })

  it('parses feet only (no inches part)', () => {
    expect(parseLengthInput("10'", 'imperial')).toBe(120)
  })

  it('parses fractional inches in feet-inches string', () => {
    const result = parseLengthInput("10'-6 1/2\"", 'imperial')
    expect(result).toBeCloseTo(126.5)
  })

  it('parses a plain number as inches', () => {
    expect(parseLengthInput('126.5', 'imperial')).toBe(126.5)
    expect(parseLengthInput('12', 'imperial')).toBe(12)
  })

  it('returns null for empty string', () => {
    expect(parseLengthInput('', 'imperial')).toBeNull()
    expect(parseLengthInput('   ', 'imperial')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseLengthInput('abc', 'imperial')).toBeNull()
    expect(parseLengthInput('--', 'imperial')).toBeNull()
  })

  it('parses metric cm strings', () => {
    const result = parseLengthInput('304.8 cm', 'metric')
    expect(result).toBeCloseTo(120)  // 304.8 cm / 2.54 = 120 inches
  })

  it('parses metric without unit suffix', () => {
    const result = parseLengthInput('254', 'metric')
    expect(result).toBeCloseTo(100)  // 254 cm / 2.54 = 100 inches
  })

  it('returns null for non-numeric metric input', () => {
    expect(parseLengthInput('abc cm', 'metric')).toBeNull()
  })
})
