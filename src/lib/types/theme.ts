export interface ColorScheme {
  type: 'solid' | 'gradient' | 'dual-tone'
  primary: string
  secondary?: string
  background: string
  gradientAngle?: number
}

export interface BarStyle {
  shape: 'rectangle' | 'rounded' | 'circular' | 'triangle'
  thickness: number
  spacing: number
  roundness?: number
}

export interface Effects {
  shadow: boolean
  shadowColor?: string
  shadowBlur?: number
  opacity: number
}

export interface Dimensions {
  width: number
  height: number
  dpi: number
}

export interface ThemeConfig {
  colorScheme: ColorScheme
  barStyle: BarStyle
  effects: Effects
  dimensions: Dimensions
}

export const DEFAULT_THEME: ThemeConfig = {
  colorScheme: {
    type: 'solid',
    primary: '#000000',
    background: '#FFFFFF',
  },
  barStyle: {
    shape: 'rectangle',
    thickness: 5,
    spacing: 3,
  },
  effects: {
    shadow: false,
    opacity: 100,
  },
  dimensions: {
    width: 15,
    height: 5,
    dpi: 300,
  },
}

export const PRESET_THEMES: Record<string, Partial<ThemeConfig>> = {
  classic: {
    colorScheme: { type: 'solid', primary: '#000000', background: '#FFFFFF' },
    barStyle: { shape: 'rectangle', thickness: 5, spacing: 3 },
  },
  elegantGold: {
    colorScheme: {
      type: 'gradient',
      primary: '#D4AF37',
      secondary: '#FFD700',
      background: '#FFFEF0',
      gradientAngle: 90,
    },
    barStyle: { shape: 'rounded', thickness: 4, spacing: 2, roundness: 30 },
  },
  oceanBlue: {
    colorScheme: {
      type: 'gradient',
      primary: '#0077BE',
      secondary: '#00C9FF',
      background: '#F0F8FF',
      gradientAngle: 45,
    },
    barStyle: { shape: 'rounded', thickness: 5, spacing: 3, roundness: 50 },
  },
  forestGreen: {
    colorScheme: {
      type: 'dual-tone',
      primary: '#2D5016',
      secondary: '#7CB342',
      background: '#F1F8E9',
    },
    barStyle: { shape: 'rectangle', thickness: 6, spacing: 2 },
  },
  sunsetGradient: {
    colorScheme: {
      type: 'gradient',
      primary: '#FF6B6B',
      secondary: '#FFD93D',
      background: '#FFF9E6',
      gradientAngle: 135,
    },
    barStyle: { shape: 'rounded', thickness: 5, spacing: 3, roundness: 40 },
  },
  midnightPurple: {
    colorScheme: {
      type: 'gradient',
      primary: '#2D1B69',
      secondary: '#6B4C9A',
      background: '#F3F0FF',
      gradientAngle: 90,
    },
    barStyle: { shape: 'circular', thickness: 4, spacing: 4 },
    effects: { shadow: true, shadowColor: '#000000', shadowBlur: 2, opacity: 90 },
  },
}

export function mergeWithDefault(partial: Partial<ThemeConfig> | null): ThemeConfig {
  if (!partial) return DEFAULT_THEME

  return {
    colorScheme: { ...DEFAULT_THEME.colorScheme, ...partial.colorScheme },
    barStyle: { ...DEFAULT_THEME.barStyle, ...partial.barStyle },
    effects: { ...DEFAULT_THEME.effects, ...partial.effects },
    dimensions: { ...DEFAULT_THEME.dimensions, ...partial.dimensions },
  }
}

export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = hexToRgb(hex)
    if (!rgb) return 0
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

export interface ThemeValidationWarning {
  type: 'contrast' | 'thickness' | 'opacity' | 'size' | 'dpi'
  message: string
  severity: 'warning' | 'error'
}

export function validateTheme(theme: ThemeConfig): ThemeValidationWarning[] {
  const warnings: ThemeValidationWarning[] = []

  // Check contrast ratio
  const contrast = getContrastRatio(theme.colorScheme.primary, theme.colorScheme.background)
  if (contrast < 4.5) {
    warnings.push({
      type: 'contrast',
      message: `Low contrast ratio (${contrast.toFixed(2)}:1). Recommended minimum is 4.5:1 for readability.`,
      severity: contrast < 3 ? 'error' : 'warning',
    })
  }

  // Check bar thickness
  if (theme.barStyle.thickness < 2) {
    warnings.push({
      type: 'thickness',
      message: 'Bar thickness is very thin. This may affect scanning reliability.',
      severity: 'warning',
    })
  }

  // Check opacity
  if (theme.effects.opacity < 70) {
    warnings.push({
      type: 'opacity',
      message: 'Low opacity may affect print and scan quality.',
      severity: 'warning',
    })
  }

  // Check dimensions
  if (theme.dimensions.width < 5) {
    warnings.push({
      type: 'size',
      message: 'Width is very small. Minimum recommended is 5mm.',
      severity: 'warning',
    })
  }

  // Check DPI
  if (theme.dimensions.dpi < 300) {
    warnings.push({
      type: 'dpi',
      message: 'DPI is too low for print quality. Minimum recommended is 300 DPI.',
      severity: 'error',
    })
  }

  return warnings
}
