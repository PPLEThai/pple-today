import { describe, expect, it } from 'vitest'

import { isThaiMobileE164, normalizeThaiPhoneNumber } from './phone'

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

describe('isThaiMobileE164', () => {
  it('accepts +66 followed by nine digits', () => {
    expect(isThaiMobileE164('+66812345678')).toBe(true)
  })

  it('rejects a number that is short of nine digits', () => {
    expect(isThaiMobileE164('+668123456')).toBe(false)
  })

  it('rejects a number with more than nine digits', () => {
    expect(isThaiMobileE164('+6681234567890')).toBe(false)
  })

  // `normalizeThaiPhoneNumber` converts formats it recognises but does not
  // reject ones it doesn't: it turns `66812345678` into `+666812345678` and
  // leaves separators in place. Those pass through normalisation intact, so
  // they have to be caught here.
  it('rejects the mis-normalised results of unrecognised input formats', () => {
    expect(isThaiMobileE164('+666812345678')).toBe(false)
    expect(isThaiMobileE164('+6681-234-5678')).toBe(false)
  })

  it('rejects non-Thai and unprefixed numbers', () => {
    expect(isThaiMobileE164('+14155552671')).toBe(false)
    expect(isThaiMobileE164('0812345678')).toBe(false)
    expect(isThaiMobileE164('')).toBe(false)
  })
})
