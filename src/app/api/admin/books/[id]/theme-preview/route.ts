import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import prisma from '@/lib/db/prisma'
import { ThemeConfig, mergeWithDefault } from '@/lib/types/theme'
import { generateThemedWaveCodeDataUrl } from '@/lib/services/imageGenerator'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/books/[id]/theme-preview - Generate preview images
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: bookId } = await params
    const { searchParams } = new URL(request.url)
    const sampleCodesParam = searchParams.get('sampleCodes')

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
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

    // Get sample codes from query or use existing pages
    let sampleCodes: string[]
    if (sampleCodesParam) {
      sampleCodes = sampleCodesParam.split(',').slice(0, 5)
    } else {
      sampleCodes = book.pages.map((p: { code: string }) => p.code)
    }

    // If no codes available, generate sample codes
    if (sampleCodes.length === 0) {
      sampleCodes = ['ABC123', 'XYZ789', 'TEST01']
    }

    const theme = mergeWithDefault(book.themeConfig as Partial<ThemeConfig> | null)

    // Generate preview images
    const samples = await Promise.all(
      sampleCodes.map(async (code) => ({
        code,
        imageUrl: await generateThemedWaveCodeDataUrl(code, theme),
      }))
    )

    return NextResponse.json({ samples })
  } catch (error) {
    console.error('Error generating theme preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}

// POST /api/admin/books/[id]/theme-preview - Generate preview with custom theme
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: bookId } = await params
    const body = await request.json()
    const { themeConfig, sampleCodes = [] } = body

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
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

    // Use provided codes or fallback to book's pages
    let codes: string[] = sampleCodes.slice(0, 5)
    if (codes.length === 0) {
      codes = book.pages.map((p: { code: string }) => p.code)
    }
    if (codes.length === 0) {
      codes = ['ABC123', 'XYZ789', 'TEST01']
    }

    const theme = mergeWithDefault(themeConfig as Partial<ThemeConfig> | null)

    // Generate preview images with the provided theme
    const samples = await Promise.all(
      codes.map(async (code) => ({
        code,
        imageUrl: await generateThemedWaveCodeDataUrl(code, theme),
      }))
    )

    return NextResponse.json({ samples })
  } catch (error) {
    console.error('Error generating theme preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}
