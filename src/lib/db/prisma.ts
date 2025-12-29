import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Strip Prisma-specific query parameters from DATABASE_URL.
 * The 'schema' parameter is Prisma-specific and not understood by pg Pool.
 */
function cleanConnectionString(url: string | undefined): string | undefined {
  if (!url) return url
  try {
    const parsed = new URL(url)
    parsed.searchParams.delete('schema')
    return parsed.toString()
  } catch {
    // If URL parsing fails, return as-is
    return url
  }
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
