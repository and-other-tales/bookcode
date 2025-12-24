import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import prisma from '@/lib/db/prisma'
import { generateUniqueCode } from '@/lib/services/codeGenerator'
import { generatePrintableWaveCode } from '@/lib/services/imageGenerator'
import { uploadWaveCodeImage, isGCSConfigured } from '@/lib/services/gcsUpload'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface AudioLinkInput {
  pageNumber: number
  audioLink: string
}

// POST /api/admin/books/[id]/generate-codes - Generate codes for all pages
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: bookId } = await params
    const body = await request.json()
    const { audioLinks } = body as { audioLinks: AudioLinkInput[] }

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Validate audio links
    if (!audioLinks || !Array.isArray(audioLinks) || audioLinks.length === 0) {
      return NextResponse.json(
        { error: 'Audio links are required' },
        { status: 400 }
      )
    }

    // Delete existing pages for this book
    await prisma.page.deleteMany({
      where: { bookId },
    })

    // Generate codes and images for each page
    const results: {
      pageNumber: number
      code: string
      imageUrl: string
      success: boolean
      error?: string
    }[] = []

    const existingCodes = new Set<string>()

    for (const { pageNumber, audioLink } of audioLinks) {
      try {
        // Generate unique code (retry if collision)
        let code: string
        let attempts = 0
        const maxAttempts = 10

        do {
          code = generateUniqueCode()
          attempts++
        } while (
          (existingCodes.has(code) ||
            (await prisma.page.findUnique({ where: { code } }))) &&
          attempts < maxAttempts
        )

        if (attempts >= maxAttempts) {
          results.push({
            pageNumber,
            code: '',
            imageUrl: '',
            success: false,
            error: 'Failed to generate unique code',
          })
          continue
        }

        existingCodes.add(code)

        // Generate wave code image
        const imageBuffer = await generatePrintableWaveCode(code)

        // Upload to GCS or local storage
        let imageUrl: string
        if (isGCSConfigured()) {
          imageUrl = await uploadWaveCodeImage(bookId, code, imageBuffer)
        } else {
          // For local development, store as base64 data URL
          imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`
        }

        // Create page record
        await prisma.page.create({
          data: {
            bookId,
            pageNumber,
            code,
            audioLink,
            imageUrl,
          },
        })

        results.push({
          pageNumber,
          code,
          imageUrl,
          success: true,
        })
      } catch (error) {
        console.error(`Error generating code for page ${pageNumber}:`, error)
        results.push({
          pageNumber,
          code: '',
          imageUrl: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Update book page count if different
    const successfulPages = results.filter(r => r.success).length
    if (book.pageCount !== successfulPages) {
      await prisma.book.update({
        where: { id: bookId },
        data: { pageCount: successfulPages },
      })
    }

    const failedCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failedCount === 0,
      totalPages: audioLinks.length,
      successfulPages,
      failedPages: failedCount,
      results,
    })
  } catch (error) {
    console.error('Error generating codes:', error)
    return NextResponse.json(
      { error: 'Failed to generate codes' },
      { status: 500 }
    )
  }
}
