import { describe, it, expect } from 'vitest'
import {
  generateUniqueCode,
  generateUniqueCodes,
  isValidCodeFormat,
  codeToNumericValues,
  codeToWavePattern,
} from './codeGenerator'

describe('codeGenerator', () => {
  describe('generateUniqueCode', () => {
    it('generates a 6-character code', () => {
      const code = generateUniqueCode()
      expect(code).toHaveLength(6)
    })

    it('generates codes with only alphanumeric characters', () => {
      const code = generateUniqueCode()
      expect(code).toMatch(/^[A-Z0-9]{6}$/)
    })

    it('generates unique codes on multiple calls', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 100; i++) {
        codes.add(generateUniqueCode())
      }
      expect(codes.size).toBe(100)
    })
  })

  describe('generateUniqueCodes', () => {
    it('generates the requested number of unique codes', () => {
      const codes = generateUniqueCodes(10)
      expect(codes).toHaveLength(10)
      expect(new Set(codes).size).toBe(10)
    })

    it('generates valid format codes', () => {
      const codes = generateUniqueCodes(5)
      codes.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{6}$/)
      })
    })
  })

  describe('isValidCodeFormat', () => {
    it('returns true for valid 6-character alphanumeric codes', () => {
      expect(isValidCodeFormat('ABC123')).toBe(true)
      expect(isValidCodeFormat('ZZZZZZ')).toBe(true)
      expect(isValidCodeFormat('000000')).toBe(true)
    })

    it('returns true for lowercase codes (converts to uppercase)', () => {
      expect(isValidCodeFormat('abc123')).toBe(true)
    })

    it('returns false for codes with wrong length', () => {
      expect(isValidCodeFormat('ABC12')).toBe(false)
      expect(isValidCodeFormat('ABC1234')).toBe(false)
      expect(isValidCodeFormat('')).toBe(false)
    })

    it('returns false for codes with invalid characters', () => {
      expect(isValidCodeFormat('ABC12!')).toBe(false)
      expect(isValidCodeFormat('ABC 12')).toBe(false)
    })

    it('returns false for null/undefined', () => {
      expect(isValidCodeFormat(null as unknown as string)).toBe(false)
      expect(isValidCodeFormat(undefined as unknown as string)).toBe(false)
    })
  })

  describe('codeToNumericValues', () => {
    it('converts letters A-Z to 0-25', () => {
      const values = codeToNumericValues('ABCXYZ')
      expect(values[0]).toBe(0) // A
      expect(values[1]).toBe(1) // B
      expect(values[2]).toBe(2) // C
      expect(values[3]).toBe(23) // X
      expect(values[4]).toBe(24) // Y
      expect(values[5]).toBe(25) // Z
    })

    it('converts digits 0-9 to 26-35', () => {
      const values = codeToNumericValues('012789')
      expect(values[0]).toBe(26) // 0
      expect(values[1]).toBe(27) // 1
      expect(values[2]).toBe(28) // 2
      expect(values[3]).toBe(33) // 7
      expect(values[4]).toBe(34) // 8
      expect(values[5]).toBe(35) // 9
    })

    it('handles mixed alphanumeric codes', () => {
      const values = codeToNumericValues('A1B2C3')
      expect(values).toEqual([0, 27, 1, 28, 2, 29])
    })

    it('handles lowercase input', () => {
      const values = codeToNumericValues('abc123')
      expect(values).toEqual([0, 1, 2, 27, 28, 29])
    })
  })

  describe('codeToWavePattern', () => {
    it('generates 24 bar heights (4 per character)', () => {
      const pattern = codeToWavePattern('ABC123')
      expect(pattern).toHaveLength(24)
    })

    it('generates values between 0 and 1', () => {
      const pattern = codeToWavePattern('ABC123')
      pattern.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      })
    })

    it('generates different patterns for different codes', () => {
      const pattern1 = codeToWavePattern('ABC123')
      const pattern2 = codeToWavePattern('XYZ789')
      expect(pattern1).not.toEqual(pattern2)
    })

    it('generates consistent patterns for the same code', () => {
      const pattern1 = codeToWavePattern('TEST01')
      const pattern2 = codeToWavePattern('TEST01')
      expect(pattern1).toEqual(pattern2)
    })
  })
})
