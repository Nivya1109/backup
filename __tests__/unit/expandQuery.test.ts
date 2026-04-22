import { describe, it, expect } from 'vitest'
import { expandQuery } from '../../lib/search/expandQuery'

describe('expandQuery()', () => {
  it('returns empty array for empty string', () => {
    expect(expandQuery('')).toEqual([])
  })

  it('returns empty array for whitespace', () => {
    expect(expandQuery('   ')).toEqual([])
  })

  it('returns empty array when no phrase matches', () => {
    // "axios" has no use-case map entry
    expect(expandQuery('axios')).toEqual([])
  })

  it('returns expanded keywords for a known use-case phrase', () => {
    // "send emails" should expand to email-related library names
    const result = expandQuery('send emails node')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('is case-insensitive', () => {
    const lower = expandQuery('send emails')
    const upper = expandQuery('SEND EMAILS')
    expect(lower).toEqual(upper)
  })

  it('returns unique keywords (no duplicates)', () => {
    const result = expandQuery('test react app')
    const unique = [...new Set(result)]
    expect(result).toEqual(unique)
  })
})
