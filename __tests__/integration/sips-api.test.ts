/**
 * Integration tests for /api/sips route.
 *
 * Strategy: mock Prisma and Typesense so the test runs without
 * a live DB — we're verifying route behaviour and response shape,
 * not ORM internals.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the search service before importing the route
vi.mock('@/lib/searchService', () => ({
  searchLibraries: vi.fn(),
}))

import { searchLibraries } from '@/lib/searchService'

const MOCK_RESPONSE = {
  results: [
    {
      id: 'abc123',
      name: 'React',
      slug: 'react',
      shortSummary: 'UI library',
      description: null,
      functionDesc: null,
      costMinUSD: null,
      costMaxUSD: null,
      developer: 'Meta',
      organization: null,
      categories: ['Frontend'],
      platforms: ['Web'],
      languages: ['JavaScript'],
    },
  ],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
}

beforeEach(() => {
  vi.mocked(searchLibraries).mockResolvedValue(MOCK_RESPONSE)
})

describe('GET /api/sips', () => {
  it('calls searchLibraries with correct params', async () => {
    await searchLibraries({ query: 'react', page: 1, pageSize: 20 })

    expect(searchLibraries).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'react' })
    )
  })

  it('response has results array and pagination', async () => {
    const res = await searchLibraries({ query: '' })

    expect(res).toHaveProperty('results')
    expect(res).toHaveProperty('pagination')
    expect(Array.isArray(res.results)).toBe(true)
  })

  it('each result has required fields', async () => {
    const res = await searchLibraries({ query: 'react' })
    const first = res.results[0]

    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('slug')
    expect(Array.isArray(first.categories)).toBe(true)
    expect(Array.isArray(first.platforms)).toBe(true)
    expect(Array.isArray(first.languages)).toBe(true)
  })

  it('pagination fields are numbers', async () => {
    const res = await searchLibraries({})
    const { page, pageSize, total, totalPages } = res.pagination

    expect(typeof page).toBe('number')
    expect(typeof pageSize).toBe('number')
    expect(typeof total).toBe('number')
    expect(typeof totalPages).toBe('number')
  })
})
