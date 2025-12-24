import { z } from 'zod'

// Book validation schemas
export const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  author: z.string().min(1, 'Author is required').max(255),
  isbn: z.string().optional().nullable(),
  pageCount: z.number().int().min(1, 'Page count must be at least 1').max(10000),
  coverImageUrl: z.string().url().optional().nullable(),
})

export const updateBookSchema = createBookSchema.partial()

// Page validation schemas
export const createPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  audioLink: z.string().url('Invalid audio URL'),
})

export const createPagesSchema = z.array(createPageSchema)

// Audio links input (one per line)
export const audioLinksSchema = z.string().transform((val, ctx) => {
  const links = val.trim().split('\n').filter(line => line.trim())
  const parsed: { pageNumber: number; audioLink: string }[] = []

  links.forEach((link, index) => {
    const trimmed = link.trim()
    if (trimmed) {
      try {
        new URL(trimmed)
        parsed.push({
          pageNumber: index + 1,
          audioLink: trimmed,
        })
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid URL on line ${index + 1}: ${trimmed}`,
        })
      }
    }
  })

  return parsed
})

// CSV validation
export const csvRowSchema = z.object({
  page_number: z.coerce.number().int().min(1),
  audio_link: z.string().url(),
})

// Validate code format
export const codeSchema = z.string().regex(/^[A-Z0-9]{6}$/, 'Invalid code format')

// API validation schemas
export const validateCodeSchema = z.object({
  code: codeSchema,
})

// Types from schemas
export type CreateBookInput = z.infer<typeof createBookSchema>
export type UpdateBookInput = z.infer<typeof updateBookSchema>
export type CreatePageInput = z.infer<typeof createPageSchema>
export type ValidateCodeInput = z.infer<typeof validateCodeSchema>
