import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import prisma from '@/lib/db/prisma'
import { updateBookSchema } from '@/lib/utils/validation'
import { deleteBookImages } from '@/lib/services/gcsUpload'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/books/[id] - Get book details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
        _count: {
          select: { pages: true },
        },
      },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    return NextResponse.json(book)
  } catch (error) {
    console.error('Error fetching book:', error)
    return NextResponse.json(
      { error: 'Failed to fetch book' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/books/[id] - Update book
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const validated = updateBookSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      )
    }

    const book = await prisma.book.update({
      where: { id },
      data: validated.data,
    })

    return NextResponse.json(book)
  } catch (error) {
    console.error('Error updating book:', error)
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/books/[id] - Delete book
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Delete book images from GCS
    await deleteBookImages(id)

    // Delete book (pages will be deleted via cascade)
    await prisma.book.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting book:', error)
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    )
  }
}
