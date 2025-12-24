import sharp from 'sharp'
import { codeToWavePattern } from './codeGenerator'
import { ThemeConfig, mergeWithDefault } from '../types/theme'

export interface WaveCodeOptions {
  width?: number        // Total image width in pixels
  height?: number       // Total image height in pixels
  barWidth?: number     // Width of each bar in pixels
  barGap?: number       // Gap between bars in pixels
  backgroundColor?: string
  barColor?: string
  dpi?: number          // For print quality (300-600 recommended)
}

const DEFAULT_OPTIONS: Required<WaveCodeOptions> = {
  width: 180,           // ~15mm at 300 DPI
  height: 60,           // ~5mm at 300 DPI
  barWidth: 4,
  barGap: 2,
  backgroundColor: '#FFFFFF',
  barColor: '#000000',
  dpi: 300,
}

// Convert mm to pixels at given DPI
function mmToPixels(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi)
}

// Generate SVG gradient definition
function createGradientDef(
  id: string,
  primary: string,
  secondary: string,
  angle: number
): string {
  const rad = (angle * Math.PI) / 180
  const x1 = 50 - 50 * Math.cos(rad)
  const y1 = 50 - 50 * Math.sin(rad)
  const x2 = 50 + 50 * Math.cos(rad)
  const y2 = 50 + 50 * Math.sin(rad)

  return `
    <linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
  `
}

// Generate bar path based on shape
function createBarPath(
  x: number,
  y: number,
  width: number,
  height: number,
  shape: ThemeConfig['barStyle']['shape'],
  roundness: number = 0
): string {
  switch (shape) {
    case 'rounded': {
      const rx = Math.min(width / 2, (roundness / 100) * (width / 2))
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ry="${rx}"/>`
    }
    case 'circular': {
      const cx = x + width / 2
      const r = width / 2
      // Draw multiple circles vertically
      const numCircles = Math.max(1, Math.floor(height / (width + 1)))
      const circleSpacing = height / numCircles
      let circles = ''
      for (let i = 0; i < numCircles; i++) {
        const cy = y + circleSpacing / 2 + i * circleSpacing
        circles += `<circle cx="${cx}" cy="${cy}" r="${r}"/>`
      }
      return circles
    }
    case 'triangle': {
      const midX = x + width / 2
      const points = `${midX},${y} ${x + width},${y + height} ${x},${y + height}`
      return `<polygon points="${points}"/>`
    }
    case 'rectangle':
    default:
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}"/>`
  }
}

/**
 * Generate a Spotify-style wave code image from a 6-character code
 * Returns a PNG buffer suitable for printing or display
 */
export async function generateWaveCode(
  code: string,
  options: WaveCodeOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { width, height, barWidth, barGap, backgroundColor, barColor } = opts

  // Get wave pattern from code
  const wavePattern = codeToWavePattern(code)

  // Calculate number of bars that fit
  const totalBarWidth = barWidth + barGap
  const numBars = Math.min(wavePattern.length, Math.floor(width / totalBarWidth))

  // Calculate starting position to center the bars
  const totalBarsWidth = numBars * totalBarWidth - barGap
  const startX = Math.floor((width - totalBarsWidth) / 2)

  // Create SVG for the wave pattern
  const bars = wavePattern.slice(0, numBars).map((amplitude, i) => {
    const x = startX + i * totalBarWidth
    const barHeight = Math.max(4, Math.floor(amplitude * (height - 8)))
    const y = Math.floor((height - barHeight) / 2)

    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="1" fill="${barColor}"/>`
  }).join('')

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      ${bars}
    </svg>
  `

  // Convert SVG to PNG using sharp
  const pngBuffer = await sharp(Buffer.from(svg))
    .png({
      compressionLevel: 9,
    })
    .withMetadata({
      density: opts.dpi,
    })
    .toBuffer()

  return pngBuffer
}

/**
 * Generate a high-resolution wave code for printing
 */
export async function generatePrintableWaveCode(
  code: string,
  options: Partial<WaveCodeOptions> = {}
): Promise<Buffer> {
  // High-res settings for print (300 DPI)
  // 15mm × 5mm at 300 DPI ≈ 177 × 59 pixels
  return generateWaveCode(code, {
    width: 177,
    height: 59,
    barWidth: 4,
    barGap: 2,
    dpi: 300,
    ...options,
  })
}

/**
 * Generate multiple wave codes in parallel
 */
export async function generateWaveCodes(
  codes: string[],
  options: WaveCodeOptions = {}
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>()

  // Process in batches to avoid memory issues
  const batchSize = 50

  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize)
    const promises = batch.map(async (code) => {
      const buffer = await generateWaveCode(code, options)
      return { code, buffer }
    })

    const batchResults = await Promise.all(promises)
    batchResults.forEach(({ code, buffer }) => {
      results.set(code, buffer)
    })
  }

  return results
}

/**
 * Generate a preview version of the wave code (lower resolution)
 */
export async function generatePreviewWaveCode(code: string): Promise<Buffer> {
  return generateWaveCode(code, {
    width: 120,
    height: 40,
    barWidth: 3,
    barGap: 1,
    dpi: 72,
  })
}

/**
 * Generate a themed wave code image using ThemeConfig
 */
export async function generateThemedWaveCode(
  code: string,
  themeConfig: Partial<ThemeConfig> | null
): Promise<Buffer> {
  const theme = mergeWithDefault(themeConfig)
  const { colorScheme, barStyle, effects, dimensions } = theme

  // Calculate dimensions in pixels
  const width = mmToPixels(dimensions.width, dimensions.dpi)
  const height = mmToPixels(dimensions.height, dimensions.dpi)

  // Get wave pattern from code
  const wavePattern = codeToWavePattern(code)

  // Calculate bar dimensions based on theme
  const barWidthScale = barStyle.thickness / 5 // Scale thickness (5 is default)
  const spacingScale = barStyle.spacing / 3 // Scale spacing (3 is default)
  const baseBarWidth = Math.max(2, Math.round(4 * barWidthScale * (dimensions.dpi / 300)))
  const baseBarGap = Math.max(1, Math.round(2 * spacingScale * (dimensions.dpi / 300)))

  // Calculate number of bars that fit
  const totalBarWidth = baseBarWidth + baseBarGap
  const numBars = Math.min(wavePattern.length, Math.floor(width / totalBarWidth))

  // Calculate starting position to center the bars
  const totalBarsWidth = numBars * totalBarWidth - baseBarGap
  const startX = Math.floor((width - totalBarsWidth) / 2)

  // Build SVG definitions (for gradients)
  let defs = ''
  let fillRef = colorScheme.primary

  if (colorScheme.type === 'gradient' && colorScheme.secondary) {
    defs = `<defs>${createGradientDef('barGradient', colorScheme.primary, colorScheme.secondary, colorScheme.gradientAngle || 90)}</defs>`
    fillRef = 'url(#barGradient)'
  }

  // Create filter for shadow effect
  let filterDef = ''
  let filterRef = ''
  if (effects.shadow) {
    const shadowBlur = effects.shadowBlur || 2
    const shadowColor = effects.shadowColor || '#000000'
    filterDef = `
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="1" stdDeviation="${shadowBlur}" flood-color="${shadowColor}" flood-opacity="0.5"/>
      </filter>
    `
    filterRef = 'filter="url(#shadow)"'
    if (defs) {
      defs = defs.replace('</defs>', `${filterDef}</defs>`)
    } else {
      defs = `<defs>${filterDef}</defs>`
    }
  }

  // Create bars with theme styling
  const bars = wavePattern.slice(0, numBars).map((amplitude, i) => {
    const x = startX + i * totalBarWidth
    const barHeight = Math.max(4, Math.floor(amplitude * (height - 8)))
    const y = Math.floor((height - barHeight) / 2)

    // Determine fill color
    let barFill = fillRef
    if (colorScheme.type === 'dual-tone' && colorScheme.secondary) {
      barFill = i % 2 === 0 ? colorScheme.primary : colorScheme.secondary
    }

    const path = createBarPath(
      x,
      y,
      baseBarWidth,
      barHeight,
      barStyle.shape,
      barStyle.roundness
    )

    return path.replace('/>', ` fill="${barFill}" ${filterRef}/>`)
      .replace('/circle>', ` fill="${barFill}" ${filterRef}/circle>`)
      .replace('</polygon>', ` fill="${barFill}" ${filterRef}</polygon>`)
  }).join('')

  // Apply opacity
  const opacityStyle = effects.opacity < 100 ? `opacity="${effects.opacity / 100}"` : ''

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${defs}
      <rect width="100%" height="100%" fill="${colorScheme.background}"/>
      <g ${opacityStyle}>
        ${bars}
      </g>
    </svg>
  `

  // Convert SVG to PNG using sharp
  const pngBuffer = await sharp(Buffer.from(svg))
    .png({
      compressionLevel: 9,
    })
    .withMetadata({
      density: dimensions.dpi,
    })
    .toBuffer()

  return pngBuffer
}

/**
 * Generate a themed wave code for printing
 */
export async function generateThemedPrintableWaveCode(
  code: string,
  themeConfig: Partial<ThemeConfig> | null
): Promise<Buffer> {
  return generateThemedWaveCode(code, themeConfig)
}

/**
 * Generate multiple themed wave codes in parallel
 */
export async function generateThemedWaveCodes(
  codes: string[],
  themeConfig: Partial<ThemeConfig> | null
): Promise<Map<string, Buffer>> {
  const results = new Map<string, Buffer>()

  // Process in batches to avoid memory issues
  const batchSize = 50

  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize)
    const promises = batch.map(async (code) => {
      const buffer = await generateThemedWaveCode(code, themeConfig)
      return { code, buffer }
    })

    const batchResults = await Promise.all(promises)
    batchResults.forEach(({ code, buffer }) => {
      results.set(code, buffer)
    })
  }

  return results
}

/**
 * Generate a themed preview (lower resolution for web display)
 */
export async function generateThemedPreviewWaveCode(
  code: string,
  themeConfig: Partial<ThemeConfig> | null
): Promise<Buffer> {
  const theme = mergeWithDefault(themeConfig)
  // Override dimensions for preview
  const previewTheme: ThemeConfig = {
    ...theme,
    dimensions: {
      width: theme.dimensions.width,
      height: theme.dimensions.height,
      dpi: 72, // Lower DPI for preview
    },
  }
  return generateThemedWaveCode(code, previewTheme)
}

/**
 * Generate a base64 data URL for a themed wave code (useful for previews)
 */
export async function generateThemedWaveCodeDataUrl(
  code: string,
  themeConfig: Partial<ThemeConfig> | null
): Promise<string> {
  const buffer = await generateThemedPreviewWaveCode(code, themeConfig)
  return `data:image/png;base64,${buffer.toString('base64')}`
}
