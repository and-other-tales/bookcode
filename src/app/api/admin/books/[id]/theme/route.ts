import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import prisma from '@/lib/db/prisma'
import { ThemeConfig, mergeWithDefault, validateTheme, PRESET_THEMES } from '@/lib/types/theme'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Validation schema for theme config
const themeConfigSchema = z.object({
  colorScheme: z.object({
    type: z.enum(['solid', 'gradient', 'dual-tone']),
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    gradientAngle: z.number().min(0).max(360).optional(),
  }).optional(),
  barStyle: z.object({
    shape: z.enum(['rectangle', 'rounded', 'circular', 'triangle']),
    thickness: z.number().min(1).max(10),
    spacing: z.number().min(1).max(5),
    roundness: z.number().min(0).max(100).optional(),
  }).optional(),
  effects: z.object({
    shadow: z.boolean(),
    shadowColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    shadowBlur: z.number().min(0).max(10).optional(),
    opacity: z.number().min(0).max(100),
  }).optional(),
  dimensions: z.object({
    width: z.number().min(1).max(100),
    height: z.number().min(1).max(50),
    dpi: z.number().min(72).max(1200),
  }).optional(),
})

// GET /api/admin/books/[id]/theme - Get current theme config
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: bookId } = await params

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        themeConfig: true,
        pages: {
          take: 5,
          select: { code: true },
          orderBy: { pageNumber: 'asc' },
        },
      },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const theme = mergeWithDefault(book.themeConfig as Partial<ThemeConfig> | null)
    const warnings = validateTheme(theme)

    return NextResponse.json({
      bookId: book.id,
      bookTitle: book.title,
      themeConfig: theme,
      warnings,
      sampleCodes: book.pages.map((p: { code: string }) => p.code),
      presets: Object.keys(PRESET_THEMES),
    })
  } catch (error) {
    console.error('Error fetching theme:', error)
    return NextResponse.json(
      { error: 'Failed to fetch theme' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/books/[id]/theme - Update theme config
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: bookId } = await params
    const body = await request.json()

    // Check if using a preset
    if (body.preset && PRESET_THEMES[body.preset]) {
      const presetTheme = PRESET_THEMES[body.preset]
      await prisma.book.update({
        where: { id: bookId },
        data: { themeConfig: presetTheme as unknown as Prisma.InputJsonValue },
      })

      const fullTheme = mergeWithDefault(presetTheme)
      const warnings = validateTheme(fullTheme)

      return NextResponse.json({
        success: true,
        message: 'Theme updated with preset',
        themeConfig: fullTheme,
        warnings,
      })
    }

    // Validate custom theme config
    const validated = themeConfigSchema.safeParse(body.themeConfig)
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid theme configuration', details: validated.error.issues },
        { status: 400 }
      )
    }

    // Check if book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Update theme config
    await prisma.book.update({
      where: { id: bookId },
      data: { themeConfig: validated.data as unknown as Prisma.InputJsonValue },
    })

    const fullTheme = mergeWithDefault(validated.data as Partial<ThemeConfig>)
    const warnings = validateTheme(fullTheme)

    return NextResponse.json({
      success: true,
      message: 'Theme updated successfully',
      themeConfig: fullTheme,
      warnings,
    })
  } catch (error) {
    console.error('Error updating theme:', error)
    return NextResponse.json(
      { error: 'Failed to update theme' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/books/[id]/theme - Reset to default theme
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: bookId } = await params

    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    await prisma.book.update({
      where: { id: bookId },
      data: { themeConfig: Prisma.DbNull },
    })

    return NextResponse.json({
      success: true,
      message: 'Theme reset to default',
    })
  } catch (error) {
    console.error('Error resetting theme:', error)
    return NextResponse.json(
      { error: 'Failed to reset theme' },
      { status: 500 }
    )
  }
}
