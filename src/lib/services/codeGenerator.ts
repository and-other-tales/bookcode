import { customAlphabet } from 'nanoid'

// Create custom alphabet for 6-character codes (A-Z, 0-9)
// This gives us 36^6 = ~2.1 billion possible combinations
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const CODE_LENGTH = 6

const generateCode = customAlphabet(ALPHABET, CODE_LENGTH)

/**
 * Generate a unique 6-character alphanumeric code
 */
export function generateUniqueCode(): string {
  return generateCode()
}

/**
 * Generate multiple unique codes
 */
export function generateUniqueCodes(count: number): string[] {
  const codes = new Set<string>()

  while (codes.size < count) {
    codes.add(generateCode())
  }

  return Array.from(codes)
}

/**
 * Validate that a code matches the expected format
 */
export function isValidCodeFormat(code: string): boolean {
  if (!code || code.length !== CODE_LENGTH) {
    return false
  }

  const validPattern = /^[A-Z0-9]{6}$/
  return validPattern.test(code.toUpperCase())
}

/**
 * Convert code to numeric values for wave pattern generation
 * A=0, Z=25, 0=26, 9=35
 */
export function codeToNumericValues(code: string): number[] {
  return code.toUpperCase().split('').map(char => {
    if (char >= 'A' && char <= 'Z') {
      return char.charCodeAt(0) - 65 // A=0, Z=25
    }
    if (char >= '0' && char <= '9') {
      return char.charCodeAt(0) - 48 + 26 // 0=26, 9=35
    }
    return 0
  })
}

/**
 * Generate wave pattern from code for visual representation
 * Returns array of bar heights (normalized 0-1)
 */
export function codeToWavePattern(code: string): number[] {
  const charValues = codeToNumericValues(code)
  const maxValue = 35 // Maximum possible value (9 in alphanumeric)

  // Generate 24 bars (4 per character) for visual appeal
  const bars: number[] = []

  charValues.forEach((val, idx) => {
    // Use character value and position to create variations
    const normalizedVal = val / maxValue
    const seed = (idx + 1) * 7

    // Create 4 bars per character with slight variations
    bars.push(Math.min(1, normalizedVal * 0.8 + 0.2))
    bars.push(Math.min(1, normalizedVal * 1.1 + 0.1))
    bars.push(Math.min(1, normalizedVal * 0.95 + 0.15))
    bars.push(Math.min(1, normalizedVal * 0.85 + 0.2))
  })

  return bars
}
