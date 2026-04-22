import { describe, it, expect } from 'vitest'
import { slugify } from '../../etl/utils'

describe('slugify()', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('Apple Watch Series 9')).toBe('apple-watch-series-9')
  })

  it('strips special characters', () => {
    expect(slugify('React (18.0)')).toBe('react-180')
  })

  it('collapses multiple hyphens', () => {
    expect(slugify('node--js')).toBe('node-js')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--my-lib--')).toBe('my-lib')
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('lowercases everything', () => {
    expect(slugify('TensorFlow')).toBe('tensorflow')
  })
})
