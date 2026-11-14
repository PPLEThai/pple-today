import { describe, expect, test } from 'vitest'

import { normalizeTagline } from './tagline'

describe('normalizeTagline', () => {
  test('trims surrounding whitespace', () => {
    expect(normalizeTagline('  ค้นคลังความรู้  ')).toBe('ค้นคลังความรู้')
  })

  test('stores a blank tagline as null', () => {
    expect(normalizeTagline('   ')).toBeNull()
    expect(normalizeTagline(null)).toBeNull()
  })

  test('leaves an omitted tagline untouched', () => {
    expect(normalizeTagline(undefined)).toBeUndefined()
  })
})
