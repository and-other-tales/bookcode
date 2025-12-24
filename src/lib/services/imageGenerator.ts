import sharp from 'sharp'
import { codeToWavePattern } from './codeGenerator'

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
