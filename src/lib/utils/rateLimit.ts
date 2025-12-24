import { LRUCache } from 'lru-cache'

interface RateLimitOptions {
  interval: number  // Time window in milliseconds
  limit: number     // Max requests per interval
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  interval: 60000,  // 1 minute
  limit: 100,       // 100 requests per minute
}

// Create LRU cache for rate limiting
const rateLimitCache = new LRUCache<string, number[]>({
  max: 5000,        // Max number of IPs to track
  ttl: 60000,       // TTL in milliseconds
})

/**
 * Check if a request should be rate limited
 * Uses sliding window algorithm
 */
export function rateLimit(
  identifier: string,
  options: Partial<RateLimitOptions> = {}
): { success: boolean; remaining: number; reset: number } {
  const { interval, limit } = { ...DEFAULT_OPTIONS, ...options }
  const now = Date.now()
  const windowStart = now - interval

  // Get existing timestamps for this identifier
  let timestamps = rateLimitCache.get(identifier) || []

  // Filter to only include timestamps within the current window
  timestamps = timestamps.filter(ts => ts > windowStart)

  // Check if limit exceeded
  if (timestamps.length >= limit) {
    const oldestTimestamp = timestamps[0]
    const reset = Math.ceil((oldestTimestamp + interval - now) / 1000)

    return {
      success: false,
      remaining: 0,
      reset,
    }
  }

  // Add current timestamp and update cache
  timestamps.push(now)
  rateLimitCache.set(identifier, timestamps)

  return {
    success: true,
    remaining: limit - timestamps.length,
    reset: Math.ceil(interval / 1000),
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return '127.0.0.1'
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(
  remaining: number,
  reset: number,
  limit: number = DEFAULT_OPTIONS.limit
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  }
}
