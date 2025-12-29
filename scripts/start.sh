#!/bin/sh
set -e

# Validate required environment variables
echo "Validating environment variables..."

missing_vars=""

# Required for database: either DATABASE_URL or all of DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
if [ -z "$DATABASE_URL" ]; then
  if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    missing_vars="$missing_vars DATABASE_URL (or DB_HOST+DB_USER+DB_PASSWORD+DB_NAME)"
  fi
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
  echo "  Database (one of the following):"
  echo "    DATABASE_URL                - PostgreSQL connection string"
  echo "    OR all of these individual vars:"
  echo "      DB_HOST                   - Database host (e.g., 10.2.0.5)"
  echo "      DB_USER                   - Database username"
  echo "      DB_PASSWORD               - Database password"
  echo "      DB_NAME                   - Database name"
  echo "      DB_PORT                   - Database port (optional, defaults to 5432)"
  echo ""
  echo "  Authentication:"
  echo "    NEXTAUTH_SECRET             - Secret for NextAuth.js session encryption"
  echo "    NEXTAUTH_URL                - Full URL of the application (e.g., https://your-app.run.app)"
  echo "    ADMIN_PASSWORD              - Password for admin authentication"
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
