import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

function getDbConfigInfo() {
  const { DB_USER, DB_NAME, DB_HOST, DB_PORT, DATABASE_URL } = process.env
  const usingIndividualVars = !!(DB_USER && DB_NAME && DB_HOST && process.env.DB_PASSWORD)

  return {
    method: usingIndividualVars ? 'DB_* variables' : 'DATABASE_URL',
    host: usingIndividualVars ? DB_HOST : (DATABASE_URL ? 'set' : 'not set'),
    user: usingIndividualVars ? DB_USER : undefined,
    database: usingIndividualVars ? DB_NAME : undefined,
    port: usingIndividualVars ? (DB_PORT || '5432') : undefined,
  }
}

// GET /api/health - Health check endpoint for Cloud Run
export async function GET() {
  const dbConfig = getDbConfigInfo()

  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        config: dbConfig,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        config: dbConfig,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
