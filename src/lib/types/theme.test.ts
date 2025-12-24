import { describe, it, expect } from 'vitest'
import {
  DEFAULT_THEME,
  PRESET_THEMES,
  mergeWithDefault,
  getContrastRatio,
  hexToRgb,
  validateTheme,
  ThemeConfig,
} from './theme'

describe('theme types', () => {
  describe('DEFAULT_THEME', () => {
    it('has valid default values', () => {
      expect(DEFAULT_THEME.colorScheme.type).toBe('solid')
      expect(DEFAULT_THEME.colorScheme.primary).toBe('#000000')
      expect(DEFAULT_THEME.colorScheme.background).toBe('#FFFFFF')
      expect(DEFAULT_THEME.barStyle.shape).toBe('rectangle')
      expect(DEFAULT_THEME.barStyle.thickness).toBe(5)
      expect(DEFAULT_THEME.effects.shadow).toBe(false)
      expect(DEFAULT_THEME.effects.opacity).toBe(100)
      expect(DEFAULT_THEME.dimensions.dpi).toBe(300)
    })
  })

  describe('PRESET_THEMES', () => {
    it('has all expected presets', () => {
      expect(PRESET_THEMES).toHaveProperty('classic')
      expect(PRESET_THEMES).toHaveProperty('elegantGold')
      expect(PRESET_THEMES).toHaveProperty('oceanBlue')
      expect(PRESET_THEMES).toHaveProperty('forestGreen')
      expect(PRESET_THEMES).toHaveProperty('sunsetGradient')
      expect(PRESET_THEMES).toHaveProperty('midnightPurple')
    })

    it('classic preset has black bars on white background', () => {
      const classic = PRESET_THEMES.classic
      expect(classic.colorScheme?.primary).toBe('#000000')
      expect(classic.colorScheme?.background).toBe('#FFFFFF')
    })

    it('gradient presets have secondary color', () => {
      const ocean = PRESET_THEMES.oceanBlue
      expect(ocean.colorScheme?.type).toBe('gradient')
      expect(ocean.colorScheme?.secondary).toBeDefined()
    })
  })

  describe('mergeWithDefault', () => {
    it('returns default theme for null input', () => {
      const result = mergeWithDefault(null)
      expect(result).toEqual(DEFAULT_THEME)
    })

    it('merges partial colorScheme', () => {
      const result = mergeWithDefault({
        colorScheme: { primary: '#FF0000' },
      } as Partial<ThemeConfig>)
      expect(result.colorScheme.primary).toBe('#FF0000')
      expect(result.colorScheme.background).toBe('#FFFFFF') // default
      expect(result.barStyle).toEqual(DEFAULT_THEME.barStyle)
    })

    it('merges partial barStyle', () => {
      const result = mergeWithDefault({
        barStyle: { thickness: 8 },
      } as Partial<ThemeConfig>)
      expect(result.barStyle.thickness).toBe(8)
      expect(result.barStyle.shape).toBe('rectangle') // default
    })

    it('preserves all nested properties', () => {
      const result = mergeWithDefault({
        colorScheme: {
          type: 'gradient',
          primary: '#FF0000',
          secondary: '#00FF00',
          background: '#FFFFFF',
          gradientAngle: 45,
        },
      })
      expect(result.colorScheme.gradientAngle).toBe(45)
    })
  })

  describe('hexToRgb', () => {
    it('converts hex to RGB object', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 })
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
      expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 })
      expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 })
    })

    it('handles lowercase hex', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('handles hex without #', () => {
      expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 })
    })

    it('returns null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull()
      expect(hexToRgb('#GGG')).toBeNull()
    })
  })

  describe('getContrastRatio', () => {
    it('returns max contrast for black on white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF')
      expect(ratio).toBeGreaterThan(20)
    })

    it('returns 1 for same colors', () => {
      const ratio = getContrastRatio('#000000', '#000000')
      expect(ratio).toBe(1)
    })

    it('returns higher ratio for better contrast', () => {
      const highContrast = getContrastRatio('#000000', '#FFFFFF')
      const lowContrast = getContrastRatio('#666666', '#888888')
      expect(highContrast).toBeGreaterThan(lowContrast)
    })
  })

  describe('validateTheme', () => {
    it('returns no warnings for default theme', () => {
      const warnings = validateTheme(DEFAULT_THEME)
      expect(warnings).toHaveLength(0)
    })

    it('warns about low contrast', () => {
      const lowContrastTheme: ThemeConfig = {
        ...DEFAULT_THEME,
        colorScheme: {
          ...DEFAULT_THEME.colorScheme,
          primary: '#CCCCCC',
          background: '#FFFFFF',
        },
      }
      const warnings = validateTheme(lowContrastTheme)
      expect(warnings.some((w) => w.type === 'contrast')).toBe(true)
    })

    it('warns about thin bars', () => {
      const thinBarsTheme: ThemeConfig = {
        ...DEFAULT_THEME,
        barStyle: {
          ...DEFAULT_THEME.barStyle,
          thickness: 1,
        },
      }
      const warnings = validateTheme(thinBarsTheme)
      expect(warnings.some((w) => w.type === 'thickness')).toBe(true)
    })

    it('warns about low opacity', () => {
      const lowOpacityTheme: ThemeConfig = {
        ...DEFAULT_THEME,
        effects: {
          ...DEFAULT_THEME.effects,
          opacity: 50,
        },
      }
      const warnings = validateTheme(lowOpacityTheme)
      expect(warnings.some((w) => w.type === 'opacity')).toBe(true)
    })

    it('warns about small dimensions', () => {
      const smallTheme: ThemeConfig = {
        ...DEFAULT_THEME,
        dimensions: {
          ...DEFAULT_THEME.dimensions,
          width: 3,
        },
      }
      const warnings = validateTheme(smallTheme)
      expect(warnings.some((w) => w.type === 'size')).toBe(true)
    })

    it('errors on low DPI', () => {
      const lowDpiTheme: ThemeConfig = {
        ...DEFAULT_THEME,
        dimensions: {
          ...DEFAULT_THEME.dimensions,
          dpi: 72,
        },
      }
      const warnings = validateTheme(lowDpiTheme)
      const dpiWarning = warnings.find((w) => w.type === 'dpi')
      expect(dpiWarning).toBeDefined()
      expect(dpiWarning?.severity).toBe('error')
    })
  })
})
