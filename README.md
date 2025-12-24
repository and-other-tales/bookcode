# BookCode - Spotify-Style Wave Code Generator

Generate unique wave codes for book pages that link to audio content. Each code can be scanned by companion apps to play associated audio.

## Features

- **Wave Code Generation**: 6-character alphanumeric codes (~2.1 billion combinations)
- **Visual Wave Patterns**: Spotify-inspired PNG images for printing
- **Admin Dashboard**: Manage books, generate codes, download ZIPs
- **Public API**: Validate codes and retrieve audio links with rate limiting
- **Cloud Ready**: Designed for Google Cloud Run deployment

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or use Docker)

### Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start PostgreSQL (using Docker):**
   ```bash
   docker compose up db -d
   ```

4. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   - Home: http://localhost:3000
   - Admin: http://localhost:3000/admin/login (default password: `admin123`)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Secret for session encryption |
| `NEXTAUTH_URL` | Yes | Full URL of your application |
| `ADMIN_PASSWORD` | Yes | Password for admin access |
| `GOOGLE_CLOUD_PROJECT` | No | GCP project ID for Cloud Storage |
| `GCS_BUCKET_NAME` | No | Cloud Storage bucket for images |
| `ALLOWED_ORIGINS` | No | CORS origins (comma-separated) |

See `.env.example` for detailed documentation.

## API Endpoints

### Public API

**Validate Code**
```bash
POST /api/validate
Content-Type: application/json

{
  "code": "J17D3Z"
}
```

**Response:**
```json
{
  "valid": true,
  "book_id": "uuid",
  "book_title": "Fortune's Told",
  "page_number": 42,
  "total_pages": 287,
  "audio_link": "https://...",
  "next_code": "K8M2P1",
  "prev_code": "H3N9Q7",
  "prefetch": [
    { "code": "K8M2P1", "page_number": 43, "audio_link": "https://..." }
  ]
}
```

Rate limit: 100 requests/minute per IP

### Admin API (Authenticated)

- `GET/POST /api/admin/books` - List/create books
- `GET/PUT/DELETE /api/admin/books/[id]` - Book operations
- `POST /api/admin/books/[id]/generate-codes` - Generate wave codes
- `GET /api/admin/books/[id]/download` - Download ZIP of images
- `POST /api/admin/pages/[id]/regenerate` - Regenerate single code

## Cloud Run Deployment

### Prerequisites

1. Google Cloud project with billing enabled
2. APIs enabled: Cloud Run, Cloud SQL, Cloud Build, Artifact Registry
3. Cloud SQL PostgreSQL instance
4. (Optional) Cloud Storage bucket for images

### Deploy with Cloud Build

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Deploy
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=us-central1,_SERVICE_NAME=bookcode
```

### Configure Environment Variables

Set these in Cloud Run console or via CLI:

```bash
gcloud run services update bookcode \
  --region=us-central1 \
  --set-env-vars="NEXTAUTH_URL=https://your-service.run.app" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,ADMIN_PASSWORD=ADMIN_PASSWORD:latest"
```

### Using Secret Manager (Recommended)

1. Create secrets:
   ```bash
   echo -n "postgresql://..." | gcloud secrets create DATABASE_URL --data-file=-
   echo -n "your-secret" | gcloud secrets create NEXTAUTH_SECRET --data-file=-
   echo -n "your-password" | gcloud secrets create ADMIN_PASSWORD --data-file=-
   ```

2. Grant access to Cloud Run service account:
   ```bash
   gcloud secrets add-iam-policy-binding DATABASE_URL \
     --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

### Cloud SQL Connection

For Cloud SQL, use the Unix socket connection:

```
DATABASE_URL="postgresql://user:password@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE"
```

Enable Cloud SQL Admin API and add Cloud SQL connection in Cloud Run settings.

## Project Structure

```
src/
├── app/
│   ├── admin/           # Admin pages (dashboard, books management)
│   ├── api/
│   │   ├── admin/       # Protected admin API routes
│   │   ├── auth/        # NextAuth.js routes
│   │   └── validate/    # Public code validation API
│   └── page.tsx         # Landing page
├── components/
│   └── ui/              # shadcn/ui components
├── hooks/               # React hooks
└── lib/
    ├── auth/            # NextAuth configuration
    ├── db/              # Prisma client
    ├── services/        # Code generation, image generation, GCS
    └── utils/           # Rate limiting, validation, utilities
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI**: shadcn/ui (Radix + Tailwind CSS)
- **Image Generation**: Sharp
- **Storage**: Google Cloud Storage (optional)

## License

MIT
