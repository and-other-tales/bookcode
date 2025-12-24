import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { validateCodeSchema } from '@/lib/utils/validation'
import { rateLimit, getClientIP, rateLimitHeaders } from '@/lib/utils/rateLimit'

// CORS headers for public API
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// POST /api/validate - Validate a code and return book/page info
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = rateLimit(clientIP, { limit: 100, interval: 60000 })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { valid: false, message: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.reset),
          },
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validated = validateCodeSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { valid: false, message: 'Invalid code format' },
        {
          status: 400,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.reset),
          },
        }
      )
    }

    const { code } = validated.data

    // Find the page by code
    const currentPage = await prisma.page.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            pageCount: true,
          },
        },
      },
    })

    if (!currentPage) {
      return NextResponse.json(
        { valid: false, message: 'Code not found' },
        {
          status: 404,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.reset),
          },
        }
      )
    }

    // Get next and previous page codes
    const [nextPage, prevPage] = await Promise.all([
      prisma.page.findFirst({
        where: {
          bookId: currentPage.bookId,
          pageNumber: currentPage.pageNumber + 1,
        },
        select: { code: true, pageNumber: true, audioLink: true },
      }),
      prisma.page.findFirst({
        where: {
          bookId: currentPage.bookId,
          pageNumber: currentPage.pageNumber - 1,
        },
        select: { code: true },
      }),
    ])

    // Build prefetch data for next 2 pages
    const prefetchPages = await prisma.page.findMany({
      where: {
        bookId: currentPage.bookId,
        pageNumber: {
          gt: currentPage.pageNumber,
          lte: currentPage.pageNumber + 2,
        },
      },
      select: {
        code: true,
        pageNumber: true,
        audioLink: true,
      },
      orderBy: { pageNumber: 'asc' },
    })

    const response = {
      valid: true,
      book_id: currentPage.book.id,
      book_title: currentPage.book.title,
      page_number: currentPage.pageNumber,
      total_pages: currentPage.book.pageCount,
      audio_link: currentPage.audioLink,
      next_code: nextPage?.code || null,
      prev_code: prevPage?.code || null,
      prefetch: prefetchPages.map(
        (p: { code: string; pageNumber: number; audioLink: string }) => ({
          code: p.code,
          page_number: p.pageNumber,
          audio_link: p.audioLink,
        })
      ),
    }

    return NextResponse.json(response, {
      headers: {
        ...corsHeaders,
        ...rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.reset),
      },
    })
  } catch (error) {
    console.error('Error validating code:', error)
    return NextResponse.json(
      { valid: false, message: 'Internal server error' },
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}
