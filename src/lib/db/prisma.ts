import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Strip Prisma-specific query parameters from DATABASE_URL.
 * The 'schema' parameter is Prisma-specific and not understood by pg Pool.
 * Uses regex instead of URL parsing because Cloud SQL socket connection
 * strings (postgresql://user:pass@/db?host=/cloudsql/...) are invalid URLs.
 */
function cleanConnectionString(url: string | undefined): string | undefined {
  if (!url) return url
  // Remove schema parameter and clean up query string
  // Handle: ?schema=x, &schema=x, ?schema=x&other, &schema=x&other
  return url
    .replace(/\?schema=[^&]*&/, '?')  // ?schema=x& -> ?
    .replace(/&schema=[^&]*/g, '')     // &schema=x -> (empty)
    .replace(/\?schema=[^&]*$/, '')    // ?schema=x at end -> (empty)
}

function createPrismaClient() {
  const connectionString = cleanConnectionString(process.env.DATABASE_URL)
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
