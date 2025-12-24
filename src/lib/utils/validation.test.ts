import { describe, it, expect } from 'vitest'
import {
  createBookSchema,
  updateBookSchema,
  createPageSchema,
  codeSchema,
  validateCodeSchema,
  audioLinksSchema,
  csvRowSchema,
} from './validation'

describe('validation schemas', () => {
  describe('createBookSchema', () => {
    it('validates a valid book input', () => {
      const result = createBookSchema.safeParse({
        title: 'Test Book',
        author: 'Test Author',
        pageCount: 100,
      })
      expect(result.success).toBe(true)
    })

    it('validates with optional fields', () => {
      const result = createBookSchema.safeParse({
        title: 'Test Book',
        author: 'Test Author',
        pageCount: 50,
        isbn: '978-0-123456-78-9',
        coverImageUrl: 'https://example.com/cover.jpg',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty title', () => {
      const result = createBookSchema.safeParse({
        title: '',
        author: 'Test Author',
        pageCount: 100,
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty author', () => {
      const result = createBookSchema.safeParse({
        title: 'Test Book',
        author: '',
        pageCount: 100,
      })
      expect(result.success).toBe(false)
    })

    it('rejects pageCount less than 1', () => {
      const result = createBookSchema.safeParse({
        title: 'Test Book',
        author: 'Test Author',
        pageCount: 0,
      })
      expect(result.success).toBe(false)
    })

    it('rejects pageCount greater than 10000', () => {
      const result = createBookSchema.safeParse({
        title: 'Test Book',
        author: 'Test Author',
        pageCount: 10001,
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid cover URL', () => {
      const result = createBookSchema.safeParse({
        title: 'Test Book',
        author: 'Test Author',
        pageCount: 100,
        coverImageUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateBookSchema', () => {
    it('allows partial updates', () => {
      const result = updateBookSchema.safeParse({
        title: 'Updated Title',
      })
      expect(result.success).toBe(true)
    })

    it('validates empty object', () => {
      const result = updateBookSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('createPageSchema', () => {
    it('validates a valid page input', () => {
      const result = createPageSchema.safeParse({
        pageNumber: 1,
        audioLink: 'https://example.com/audio.mp3',
      })
      expect(result.success).toBe(true)
    })

    it('rejects pageNumber less than 1', () => {
      const result = createPageSchema.safeParse({
        pageNumber: 0,
        audioLink: 'https://example.com/audio.mp3',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid audioLink URL', () => {
      const result = createPageSchema.safeParse({
        pageNumber: 1,
        audioLink: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('codeSchema', () => {
    it('validates valid 6-character alphanumeric codes', () => {
      expect(codeSchema.safeParse('ABC123').success).toBe(true)
      expect(codeSchema.safeParse('ZZZZZZ').success).toBe(true)
      expect(codeSchema.safeParse('000000').success).toBe(true)
    })

    it('rejects lowercase codes', () => {
      expect(codeSchema.safeParse('abc123').success).toBe(false)
    })

    it('rejects codes with wrong length', () => {
      expect(codeSchema.safeParse('ABC12').success).toBe(false)
      expect(codeSchema.safeParse('ABC1234').success).toBe(false)
    })

    it('rejects codes with special characters', () => {
      expect(codeSchema.safeParse('ABC12!').success).toBe(false)
    })
  })

  describe('validateCodeSchema', () => {
    it('validates object with valid code', () => {
      const result = validateCodeSchema.safeParse({ code: 'ABC123' })
      expect(result.success).toBe(true)
    })

    it('rejects object with invalid code', () => {
      const result = validateCodeSchema.safeParse({ code: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('audioLinksSchema', () => {
    it('parses valid audio links', () => {
      const input = 'https://example.com/page1.mp3\nhttps://example.com/page2.mp3'
      const result = audioLinksSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0]).toEqual({
          pageNumber: 1,
          audioLink: 'https://example.com/page1.mp3',
        })
        expect(result.data[1]).toEqual({
          pageNumber: 2,
          audioLink: 'https://example.com/page2.mp3',
        })
      }
    })

    it('ignores empty lines', () => {
      const input = 'https://example.com/page1.mp3\n\nhttps://example.com/page2.mp3'
      const result = audioLinksSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })

    it('reports invalid URLs with line numbers', () => {
      const input = 'https://example.com/page1.mp3\nnot-a-url\nhttps://example.com/page3.mp3'
      const result = audioLinksSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('csvRowSchema', () => {
    it('validates valid CSV row data', () => {
      const result = csvRowSchema.safeParse({
        page_number: '5',
        audio_link: 'https://example.com/audio.mp3',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page_number).toBe(5)
      }
    })

    it('coerces string page_number to number', () => {
      const result = csvRowSchema.safeParse({
        page_number: '10',
        audio_link: 'https://example.com/audio.mp3',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.page_number).toBe('number')
      }
    })

    it('rejects invalid page_number', () => {
      const result = csvRowSchema.safeParse({
        page_number: 'abc',
        audio_link: 'https://example.com/audio.mp3',
      })
      expect(result.success).toBe(false)
    })
  })
})
