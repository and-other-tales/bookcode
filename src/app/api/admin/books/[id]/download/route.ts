import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import prisma from '@/lib/db/prisma'
import archiver from 'archiver'
import { generatePrintableWaveCode } from '@/lib/services/imageGenerator'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/books/[id]/download - Download ZIP of all code images
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: bookId } = await params

    // Get book with pages
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
      },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.pages.length === 0) {
      return NextResponse.json(
        { error: 'No pages generated for this book' },
        { status: 400 }
      )
    }

    // Create ZIP archive in memory
    const chunks: Uint8Array[] = []

    const archive = archiver('zip', {
      zlib: { level: 9 },
    })

    archive.on('data', (chunk) => {
      chunks.push(chunk)
    })

    const archiveFinished = new Promise<void>((resolve, reject) => {
      archive.on('end', resolve)
      archive.on('error', reject)
    })

    // Add images to archive
    for (const page of book.pages) {
      // Regenerate image to ensure fresh copy
      const imageBuffer = await generatePrintableWaveCode(page.code)
      const pageNumPadded = page.pageNumber.toString().padStart(3, '0')
      const filename = `page_${pageNumPadded}_${page.code}.png`

      archive.append(imageBuffer, { name: filename })
    }

    // Add manifest CSV
    const manifestContent = [
      'page_number,code,audio_link',
      ...book.pages.map(
        (p: { pageNumber: number; code: string; audioLink: string }) =>
          `${p.pageNumber},"${p.code}","${p.audioLink}"`
      ),
    ].join('\n')

    archive.append(manifestContent, { name: 'manifest.csv' })

    // Finalize archive
    archive.finalize()
    await archiveFinished

    // Combine chunks into buffer
    const buffer = Buffer.concat(chunks)

    // Create filename
    const safeTitle = book.title.replace(/[^a-zA-Z0-9]/g, '_')
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${safeTitle}_codes_${timestamp}.zip`

    // Return ZIP file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error creating download:', error)
    return NextResponse.json(
      { error: 'Failed to create download' },
      { status: 500 }
    )
  }
}
