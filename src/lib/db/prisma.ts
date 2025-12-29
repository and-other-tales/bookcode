import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Strip Prisma-specific query parameters from a connection string.
 * The 'schema' parameter is Prisma-specific and not understood by pg Pool.
 */
function cleanConnectionString(url: string | undefined): string | undefined {
  if (!url) return url
  // Remove schema parameter and clean up query string
  return url
    .replace(/\?schema=[^&]*&/, '?')  // ?schema=x& -> ?
    .replace(/&schema=[^&]*/g, '')     // &schema=x -> (empty)
    .replace(/\?schema=[^&]*$/, '')    // ?schema=x at end -> (empty)
}

/**
 * Build a PostgreSQL connection string from individual environment variables.
 * Falls back to DATABASE_URL if individual vars are not set.
 */
function buildConnectionString(): string | undefined {
  const { DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DATABASE_URL } = process.env

  // If individual DB_* vars are provided, build the connection string
  if (DB_USER && DB_PASSWORD && DB_NAME && DB_HOST) {
    const port = process.env.DB_PORT || '5432'
    console.log(`Database: connecting to ${DB_HOST}:${port}/${DB_NAME} as ${DB_USER}`)
    return `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${port}/${DB_NAME}`
  }

  // Fall back to DATABASE_URL
  if (DATABASE_URL) {
    console.log('Database: using DATABASE_URL')
  }
  return cleanConnectionString(DATABASE_URL)
}

function createPrismaClient() {
  const connectionString = buildConnectionString()
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
