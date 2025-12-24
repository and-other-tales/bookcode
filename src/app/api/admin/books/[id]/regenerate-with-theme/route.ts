import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import prisma from '@/lib/db/prisma'
import { ThemeConfig, mergeWithDefault } from '@/lib/types/theme'
import { generateThemedWaveCode } from '@/lib/services/imageGenerator'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/books/[id]/regenerate-with-theme - Regenerate all codes with theme
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: bookId } = await params
    const body = await request.json()
    const { pageIds } = body // Optional: specific pages to regenerate

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        themeConfig: true,
        pages: {
          select: {
            id: true,
            code: true,
            pageNumber: true,
          },
          orderBy: { pageNumber: 'asc' },
        },
      },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const theme = mergeWithDefault(book.themeConfig as Partial<ThemeConfig> | null)

    // Filter pages if specific IDs provided
    let pagesToRegenerate = book.pages
    if (pageIds && Array.isArray(pageIds) && pageIds.length > 0) {
      pagesToRegenerate = book.pages.filter(
        (p: { id: string }) => pageIds.includes(p.id)
      )
    }

    if (pagesToRegenerate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pages to regenerate',
        regenerated: 0,
      })
    }

    // Regenerate images for each page
    // In a production environment, this would be done in a background job
    const regenerationResults = await Promise.all(
      pagesToRegenerate.map(async (page: { id: string; code: string; pageNumber: number }) => {
        try {
          // Generate new image with theme
          const imageBuffer = await generateThemedWaveCode(page.code, theme)

          // For now, we'll store as base64 data URL
          // In production, you'd upload to cloud storage
          const imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`

          // Update page with new image URL
          await prisma.page.update({
            where: { id: page.id },
            data: { imageUrl },
          })

          return { pageId: page.id, success: true }
        } catch (error) {
          console.error(`Error regenerating page ${page.id}:`, error)
          return { pageId: page.id, success: false, error: String(error) }
        }
      })
    )

    const successCount = regenerationResults.filter((r) => r.success).length
    const failureCount = regenerationResults.filter((r) => !r.success).length

    return NextResponse.json({
      success: failureCount === 0,
      message: `Regenerated ${successCount} of ${pagesToRegenerate.length} pages`,
      regenerated: successCount,
      failed: failureCount,
      results: regenerationResults,
    })
  } catch (error) {
    console.error('Error regenerating codes:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate codes' },
      { status: 500 }
    )
  }
}
