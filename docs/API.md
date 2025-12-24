# BookCode API Documentation

This document describes the BookCode API endpoints for validating codes and integrating with AI/client applications.

## Base URL

```
Production: https://your-domain.com
Development: http://localhost:3000
```

## Public API Endpoints

### Validate Code

Validates a 6-character alphanumeric code and returns book/page information with audio links.

**Endpoint:** `POST /api/validate`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "ABC123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | 6-character alphanumeric code (A-Z, 0-9) |

**Success Response (200):**
```json
{
  "valid": true,
  "book_id": "uuid-of-book",
  "book_title": "The Adventure Book",
  "page_number": 5,
  "total_pages": 24,
  "audio_link": "https://storage.example.com/audio/page5.mp3",
  "next_code": "XYZ789",
  "prev_code": "DEF456",
  "prefetch": [
    {
      "code": "XYZ789",
      "page_number": 6,
      "audio_link": "https://storage.example.com/audio/page6.mp3"
    },
    {
      "code": "GHI012",
      "page_number": 7,
      "audio_link": "https://storage.example.com/audio/page7.mp3"
    }
  ]
}
```

**Error Responses:**

Code not found (404):
```json
{
  "valid": false,
  "message": "Code not found"
}
```

Invalid format (400):
```json
{
  "valid": false,
  "message": "Invalid code format"
}
```

Rate limit exceeded (429):
```json
{
  "valid": false,
  "message": "Rate limit exceeded"
}
```

**Rate Limit Headers:**
All responses include rate limit information:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 60
```

**CORS:**
The API supports CORS and can be called from browser applications. Configure `ALLOWED_ORIGINS` environment variable to restrict origins.

## Code Format

Codes are 6 characters consisting of uppercase letters (A-Z) and digits (0-9):
- Total combinations: 36^6 = ~2.1 billion
- Example valid codes: `ABC123`, `ZZZZZZ`, `000000`, `A1B2C3`
- Codes are case-insensitive (lowercase is converted to uppercase)

## Client Integration Examples

### JavaScript/TypeScript

```typescript
interface ValidateResponse {
  valid: boolean;
  book_id?: string;
  book_title?: string;
  page_number?: number;
  total_pages?: number;
  audio_link?: string;
  next_code?: string | null;
  prev_code?: string | null;
  prefetch?: Array<{
    code: string;
    page_number: number;
    audio_link: string;
  }>;
  message?: string;
}

async function validateCode(code: string): Promise<ValidateResponse> {
  const response = await fetch('https://your-domain.com/api/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: code.toUpperCase() }),
  });

  return response.json();
}

// Usage
const result = await validateCode('ABC123');
if (result.valid) {
  console.log(`Playing: ${result.book_title} - Page ${result.page_number}`);
  // Play audio from result.audio_link
  const audio = new Audio(result.audio_link);
  audio.play();
}
```

### Python

```python
import requests

def validate_code(code: str) -> dict:
    response = requests.post(
        'https://your-domain.com/api/validate',
        json={'code': code.upper()},
        headers={'Content-Type': 'application/json'}
    )
    return response.json()

# Usage
result = validate_code('ABC123')
if result.get('valid'):
    print(f"Book: {result['book_title']}, Page: {result['page_number']}")
    print(f"Audio: {result['audio_link']}")
```

### cURL

```bash
curl -X POST https://your-domain.com/api/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "ABC123"}'
```

## AI Integration Guide

### For AI Assistants/Chatbots

When integrating with AI assistants that help users with audiobooks:

1. **Code Recognition**: Look for 6-character alphanumeric patterns in user input
2. **Validation**: Call the `/api/validate` endpoint to verify codes
3. **Audio Playback**: Use the returned `audio_link` for playback
4. **Navigation**: Use `next_code` and `prev_code` for sequential navigation
5. **Prefetching**: Cache `prefetch` data for smoother navigation

### Example AI Prompt Handler

```typescript
async function handleUserMessage(message: string) {
  // Extract potential codes from message
  const codePattern = /\b[A-Z0-9]{6}\b/gi;
  const potentialCodes = message.match(codePattern);

  if (potentialCodes) {
    for (const code of potentialCodes) {
      const result = await validateCode(code);
      if (result.valid) {
        return {
          type: 'audiobook_page',
          book: result.book_title,
          page: result.page_number,
          totalPages: result.total_pages,
          audioUrl: result.audio_link,
          navigation: {
            next: result.next_code,
            previous: result.prev_code,
          },
        };
      }
    }
  }

  return { type: 'text', message: 'No valid code found' };
}
```

### Error Handling Best Practices

```typescript
async function safeValidateCode(code: string) {
  try {
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    // Check rate limiting
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining && parseInt(remaining) < 10) {
      console.warn('Approaching rate limit');
    }

    if (response.status === 429) {
      const reset = response.headers.get('X-RateLimit-Reset');
      throw new Error(`Rate limited. Try again in ${reset} seconds`);
    }

    return await response.json();
  } catch (error) {
    console.error('Validation error:', error);
    return { valid: false, message: 'Network error' };
  }
}
```

## Admin API Endpoints

These endpoints require authentication via NextAuth session.

### List Books
`GET /api/admin/books`

Query parameters:
- `page` (number): Page number for pagination
- `limit` (number): Items per page
- `search` (string): Search by title or author

### Get Book
`GET /api/admin/books/[id]`

### Create Book
`POST /api/admin/books`

### Update Book
`PATCH /api/admin/books/[id]`

### Delete Book
`DELETE /api/admin/books/[id]`

### Generate Codes
`POST /api/admin/books/[id]/generate-codes`

### Download Codes
`GET /api/admin/books/[id]/download`

Returns a ZIP file containing:
- PNG images of wave codes for each page
- `manifest.csv` with page numbers, codes, and audio links

### Regenerate Page Code
`POST /api/admin/pages/[id]/regenerate`

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"
ADMIN_PASSWORD="your-admin-password"

# CORS (optional)
ALLOWED_ORIGINS="https://app1.com,https://app2.com"

# Google Cloud Storage (optional, for file uploads)
GOOGLE_CLOUD_PROJECT="your-project"
GOOGLE_CLOUD_BUCKET="your-bucket"
```

## Rate Limiting

The public validate endpoint is rate limited:
- **Default**: 100 requests per minute per IP
- **Headers**: Rate limit info included in all responses
- **Behavior**: Returns 429 when exceeded

## Wave Code Visual Format

Each code generates a unique visual "wave" pattern similar to Spotify codes:
- 24 bars of varying heights
- Heights derived deterministically from the code
- Can be printed or displayed for scanning
- Generated as PNG images for print quality
