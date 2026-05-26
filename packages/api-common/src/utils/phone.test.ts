import { describe, expect, it } from 'vitest'

import { normalizeThaiPhoneNumber } from './phone'

describe('normalizeThaiPhoneNumber', () => {
  it('keeps +66 E.164 format unchanged', () => {
    expect(normalizeThaiPhoneNumber('+66812345678')).toBe('+66812345678')
  })

  it('converts 0-prefixed domestic format to +66', () => {
    expect(normalizeThaiPhoneNumber('0812345678')).toBe('+66812345678')
  })

  it('trims whitespace before normalizing', () => {
    expect(normalizeThaiPhoneNumber(' 0812345678 ')).toBe('+66812345678')
  })
})
