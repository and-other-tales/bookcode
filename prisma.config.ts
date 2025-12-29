import path from 'node:path'
import { defineConfig } from 'prisma/config'

/**
 * Build a PostgreSQL connection string from individual environment variables.
 * Falls back to DATABASE_URL if individual vars are not set.
 */
function buildDatabaseUrl(): string | undefined {
  const { DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DATABASE_URL } = process.env

  // If individual DB_* vars are provided, build the connection string
  if (DB_USER && DB_PASSWORD && DB_NAME && DB_HOST) {
    const port = process.env.DB_PORT || '5432'
    return `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${port}/${DB_NAME}`
  }

  // Fall back to DATABASE_URL
  return DATABASE_URL
}

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: buildDatabaseUrl(),
  },
})
