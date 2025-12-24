import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import prisma from '@/lib/db/prisma'
import { generateUniqueCode } from '@/lib/services/codeGenerator'
import { generatePrintableWaveCode } from '@/lib/services/imageGenerator'
import { uploadWaveCodeImage, isGCSConfigured, deleteFromGCS } from '@/lib/services/gcsUpload'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/pages/[id]/regenerate - Regenerate code for a single page
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: pageId } = await params

    // Get existing page
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: { book: true },
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    const oldCode = page.code

    // Generate new unique code
    let newCode: string
    let attempts = 0
    const maxAttempts = 10

    do {
      newCode = generateUniqueCode()
      attempts++
      const existing = await prisma.page.findUnique({
        where: { code: newCode },
      })
      if (!existing) break
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique code' },
        { status: 500 }
      )
    }

    // Generate new wave code image
    const imageBuffer = await generatePrintableWaveCode(newCode)

    // Upload to GCS or local storage
    let imageUrl: string
    if (isGCSConfigured()) {
      // Delete old image
      await deleteFromGCS(`books/${page.bookId}/${oldCode}.png`)
      // Upload new image
      imageUrl = await uploadWaveCodeImage(page.bookId, newCode, imageBuffer)
    } else {
      imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`
    }

    // Update page record
    const updatedPage = await prisma.page.update({
      where: { id: pageId },
      data: {
        code: newCode,
        imageUrl,
      },
    })

    return NextResponse.json({
      success: true,
      page: updatedPage,
      oldCode,
      newCode,
    })
  } catch (error) {
    console.error('Error regenerating code:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate code' },
      { status: 500 }
    )
  }
}
