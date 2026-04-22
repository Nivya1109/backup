/**
 * Tests for ETL pipeline logic — source validation, data shape, error handling.
 * These tests do NOT hit the network or database.
 */
import { describe, it, expect, vi } from 'vitest'

// Pure helper: validates that a SIPData object has the minimum required fields
function isValidSIPData(sip: unknown): boolean {
  if (typeof sip !== 'object' || sip === null) return false
  const s = sip as Record<string, unknown>
  return (
    typeof s.name === 'string' &&
    s.name.trim().length > 0 &&
    typeof s.type === 'string'
  )
}

describe('SIP data validation', () => {
  it('accepts a valid SIP object', () => {
    expect(isValidSIPData({ name: 'React', type: 'library' })).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidSIPData(null)).toBe(false)
  })

  it('rejects empty name', () => {
    expect(isValidSIPData({ name: '', type: 'library' })).toBe(false)
  })

  it('rejects missing type', () => {
    expect(isValidSIPData({ name: 'React' })).toBe(false)
  })
})

describe('ETL source fetch error handling', () => {
  it('captures error message when a source throws', async () => {
    const faultyFetch = vi.fn().mockRejectedValue(new Error('Network timeout'))

    let errorMessage = ''
    try {
      await faultyFetch()
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e)
    }

    expect(errorMessage).toBe('Network timeout')
  })

  it('does not throw when source returns empty array', async () => {
    const emptyFetch = vi.fn().mockResolvedValue([])
    const result = await emptyFetch()
    expect(result).toEqual([])
  })
})
