#!/bin/sh
set -e

# Validate required environment variables
echo "Validating environment variables..."

missing_vars=""

# Required for database
if [ -z "$DATABASE_URL" ]; then
  missing_vars="$missing_vars DATABASE_URL"
fi

# Required for authentication
if [ -z "$NEXTAUTH_SECRET" ]; then
  missing_vars="$missing_vars NEXTAUTH_SECRET"
fi

if [ -z "$NEXTAUTH_URL" ]; then
  missing_vars="$missing_vars NEXTAUTH_URL"
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  missing_vars="$missing_vars ADMIN_PASSWORD"
fi

# Check if any required variables are missing
if [ -n "$missing_vars" ]; then
  echo "ERROR: Missing required environment variables:$missing_vars"
  echo ""
  echo "Required environment variables:"
  echo "  DATABASE_URL      - PostgreSQL connection string"
  echo "  NEXTAUTH_SECRET   - Secret for NextAuth.js session encryption"
  echo "  NEXTAUTH_URL      - Full URL of the application (e.g., https://your-app.run.app)"
  echo "  ADMIN_PASSWORD    - Password for admin authentication"
  echo ""
  echo "Optional environment variables:"
  echo "  GOOGLE_CLOUD_PROJECT - GCP project ID for Cloud Storage"
  echo "  GCS_BUCKET_NAME      - Cloud Storage bucket for code images"
  echo "  ALLOWED_ORIGINS      - Comma-separated CORS origins"
  exit 1
fi

echo "Environment validation passed."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the server
echo "Starting server..."
exec node /app/server.js
