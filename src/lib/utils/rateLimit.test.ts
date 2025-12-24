import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit, getClientIP, rateLimitHeaders } from './rateLimit'

describe('rateLimit', () => {
  beforeEach(() => {
    // Reset date mock between tests
    vi.useRealTimers()
  })

  describe('rateLimit function', () => {
    it('allows requests under the limit', () => {
      const identifier = `test-${Date.now()}-${Math.random()}`
      const result = rateLimit(identifier, { limit: 10, interval: 60000 })
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(9)
    })

    it('tracks multiple requests from the same identifier', () => {
      const identifier = `test-multi-${Date.now()}-${Math.random()}`

      for (let i = 0; i < 5; i++) {
        const result = rateLimit(identifier, { limit: 10, interval: 60000 })
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(9 - i)
      }
    })

    it('blocks requests over the limit', () => {
      const identifier = `test-blocked-${Date.now()}-${Math.random()}`

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        rateLimit(identifier, { limit: 5, interval: 60000 })
      }

      // Next request should be blocked
      const result = rateLimit(identifier, { limit: 5, interval: 60000 })
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('uses default options when none provided', () => {
      const identifier = `test-default-${Date.now()}-${Math.random()}`
      const result = rateLimit(identifier)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(99) // default limit is 100
    })

    it('different identifiers have separate limits', () => {
      const id1 = `test-a-${Date.now()}-${Math.random()}`
      const id2 = `test-b-${Date.now()}-${Math.random()}`

      // Use up all requests for id1
      for (let i = 0; i < 3; i++) {
        rateLimit(id1, { limit: 3, interval: 60000 })
      }

      // id1 should be blocked
      expect(rateLimit(id1, { limit: 3, interval: 60000 }).success).toBe(false)

      // id2 should still work
      expect(rateLimit(id2, { limit: 3, interval: 60000 }).success).toBe(true)
    })
  })

  describe('getClientIP', () => {
    it('returns x-forwarded-for header when present', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      })
      expect(getClientIP(request)).toBe('192.168.1.1')
    })

    it('returns x-real-ip header when x-forwarded-for is absent', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      })
      expect(getClientIP(request)).toBe('192.168.1.2')
    })

    it('returns default IP when no headers present', () => {
      const request = new Request('https://example.com')
      expect(getClientIP(request)).toBe('127.0.0.1')
    })

    it('prefers x-forwarded-for over x-real-ip', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      })
      expect(getClientIP(request)).toBe('192.168.1.1')
    })
  })

  describe('rateLimitHeaders', () => {
    it('returns correct headers', () => {
      const headers = rateLimitHeaders(50, 30)
      expect(headers['X-RateLimit-Limit']).toBe('100')
      expect(headers['X-RateLimit-Remaining']).toBe('50')
      expect(headers['X-RateLimit-Reset']).toBe('30')
    })

    it('uses custom limit in headers', () => {
      const headers = rateLimitHeaders(10, 60, 50)
      expect(headers['X-RateLimit-Limit']).toBe('50')
      expect(headers['X-RateLimit-Remaining']).toBe('10')
      expect(headers['X-RateLimit-Reset']).toBe('60')
    })
  })
})
