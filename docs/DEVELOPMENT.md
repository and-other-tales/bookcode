# BookCode Development Guide

This guide covers setting up and developing the BookCode application.

## Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or yarn

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd bookcode
npm install
```

### 2. Environment Setup

Create a `.env` file:

```bash
# Database - PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/bookcode"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Admin Authentication
ADMIN_PASSWORD="your-admin-password"

# Optional: CORS allowed origins (comma-separated)
ALLOWED_ORIGINS="*"

# Optional: Google Cloud Storage
GOOGLE_CLOUD_PROJECT="your-project"
GOOGLE_CLOUD_BUCKET="your-bucket"
```

### 3. Database Setup

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` for the public interface and `http://localhost:3000/admin` for the admin panel.

## Project Structure

```
bookcode/
├── docs/                    # Documentation
│   ├── API.md              # API reference
│   └── DEVELOPMENT.md      # This file
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── prisma.config.ts    # Prisma 7 configuration
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # API routes
│   │   │   ├── admin/      # Protected admin endpoints
│   │   │   ├── auth/       # NextAuth handlers
│   │   │   └── validate/   # Public code validation
│   │   ├── admin/          # Admin UI pages
│   │   └── page.tsx        # Public landing page
│   ├── components/         # React components
│   │   └── ui/             # Shared UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core libraries
│   │   ├── auth/           # Authentication config
│   │   ├── db/             # Database client
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   └── test/               # Test setup
├── vitest.config.ts        # Test configuration
└── package.json
```

## Available Scripts

```bash
# Development
npm run dev           # Start dev server

# Building
npm run build         # Build for production
npm run start         # Start production server

# Testing
npm run test          # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Linting
npm run lint          # Run ESLint
```

## Database Schema

### Book
- `id`: UUID primary key
- `title`: Book title
- `author`: Author name
- `isbn`: Optional ISBN
- `pageCount`: Total pages
- `coverImageUrl`: Optional cover image
- `createdAt`, `updatedAt`: Timestamps

### Page
- `id`: UUID primary key
- `bookId`: Foreign key to Book
- `pageNumber`: Page number in book
- `code`: Unique 6-character code
- `audioLink`: URL to audio file
- `imageUrl`: URL to code image
- `createdAt`: Timestamp

## Key Components

### Code Generator (`src/lib/services/codeGenerator.ts`)

Generates unique 6-character alphanumeric codes:

```typescript
import { generateUniqueCode, generateUniqueCodes } from '@/lib/services/codeGenerator'

// Single code
const code = generateUniqueCode() // e.g., "ABC123"

// Multiple codes
const codes = generateUniqueCodes(10) // Array of 10 unique codes
```

### Image Generator (`src/lib/services/imageGenerator.ts`)

Creates wave pattern images from codes:

```typescript
import { generatePrintableWaveCode } from '@/lib/services/imageGenerator'

const pngBuffer = await generatePrintableWaveCode('ABC123')
```

### Rate Limiter (`src/lib/utils/rateLimit.ts`)

Sliding window rate limiting:

```typescript
import { rateLimit, getClientIP } from '@/lib/utils/rateLimit'

const ip = getClientIP(request)
const result = rateLimit(ip, { limit: 100, interval: 60000 })

if (!result.success) {
  // Rate limited
}
```

### Validation (`src/lib/utils/validation.ts`)

Zod schemas for input validation:

```typescript
import { createBookSchema, validateCodeSchema } from '@/lib/utils/validation'

const bookResult = createBookSchema.safeParse(input)
const codeResult = validateCodeSchema.safeParse({ code: 'ABC123' })
```

## Testing

Tests are written with Vitest and located alongside source files:

```
src/lib/services/codeGenerator.ts      # Source
src/lib/services/codeGenerator.test.ts # Tests
```

Run tests:

```bash
npm run test
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from './myModule'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected')
  })
})
```

## API Development

### Adding a New Endpoint

1. Create route file in `src/app/api/`:

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello' })
}
```

2. For protected endpoints, check session:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Protected logic here
}
```

### Input Validation

Always validate input with Zod:

```typescript
import { z } from 'zod'

const inputSchema = z.object({
  name: z.string().min(1).max(100),
  count: z.number().int().positive(),
})

const result = inputSchema.safeParse(await request.json())
if (!result.success) {
  return NextResponse.json(
    { error: 'Invalid input', details: result.error.issues },
    { status: 400 }
  )
}
```

## Prisma 7 Notes

This project uses Prisma 7 with the PostgreSQL adapter:

### Configuration

The connection is configured in two places:

1. `prisma/prisma.config.ts` - For CLI operations (migrations)
2. `src/lib/db/prisma.ts` - For runtime with pg adapter

### Client Setup

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
```

### Migrations

```bash
# Push schema changes (development)
npx prisma db push

# Create migration (production)
npx prisma migrate dev --name migration_name
```

## Deployment

### Build

```bash
npm run build
```

### Environment Variables

Ensure all required variables are set:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `ADMIN_PASSWORD`

### Cloud Run

The project includes Cloud Run configuration. Deploy with:

```bash
gcloud run deploy bookcode \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

## Troubleshooting

### Prisma Client Not Found

Run `npx prisma generate` after installing dependencies.

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check PostgreSQL is running
3. Ensure database exists

### Test Failures

1. Ensure all dependencies are installed
2. Check test setup file exists at `src/test/setup.ts`
3. Verify environment variables are mocked in setup

### Build Errors

1. Run `npm run lint` to check for TypeScript errors
2. Ensure Prisma client is generated: `npx prisma generate`
3. Check for circular dependencies
