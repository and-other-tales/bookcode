import { Storage } from '@google-cloud/storage'

// Initialize GCS client (uses Application Default Credentials in Cloud Run)
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const bucketName = process.env.GCS_BUCKET_NAME || 'book-codes'

/**
 * Check if GCS is configured
 */
export function isGCSConfigured(): boolean {
  return !!(process.env.GOOGLE_CLOUD_PROJECT && process.env.GCS_BUCKET_NAME)
}

/**
 * Upload a file to Google Cloud Storage
 */
export async function uploadToGCS(
  buffer: Buffer,
  filename: string,
  contentType: string = 'image/png'
): Promise<string> {
  if (!isGCSConfigured()) {
    // Return a placeholder URL for local development
    return `/api/images/${filename}`
  }

  const bucket = storage.bucket(bucketName)
  const file = bucket.file(filename)

  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  })

  // Make the file publicly readable
  await file.makePublic()

  // Return the public URL
  return `https://storage.googleapis.com/${bucketName}/${filename}`
}

/**
 * Upload a wave code image for a book page
 */
export async function uploadWaveCodeImage(
  bookId: string,
  code: string,
  buffer: Buffer
): Promise<string> {
  const filename = `books/${bookId}/${code}.png`
  return uploadToGCS(buffer, filename)
}

/**
 * Delete a file from Google Cloud Storage
 */
export async function deleteFromGCS(filename: string): Promise<void> {
  if (!isGCSConfigured()) {
    return
  }

  const bucket = storage.bucket(bucketName)
  const file = bucket.file(filename)

  try {
    await file.delete()
  } catch (error) {
    // Ignore errors if file doesn't exist
    console.warn(`Failed to delete file ${filename}:`, error)
  }
}

/**
 * Delete all wave code images for a book
 */
export async function deleteBookImages(bookId: string): Promise<void> {
  if (!isGCSConfigured()) {
    return
  }

  const bucket = storage.bucket(bucketName)
  const [files] = await bucket.getFiles({
    prefix: `books/${bookId}/`,
  })

  await Promise.all(files.map(file => file.delete()))
}

/**
 * Get a signed URL for temporary access (if needed for private buckets)
 */
export async function getSignedUrl(
  filename: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!isGCSConfigured()) {
    return `/api/images/${filename}`
  }

  const bucket = storage.bucket(bucketName)
  const file = bucket.file(filename)

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresIn * 1000,
  })

  return url
}
