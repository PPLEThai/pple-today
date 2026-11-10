import { createCipheriv, createHash, randomBytes } from 'node:crypto'

import { describe, expect, test } from 'vitest'

import {
  decryptCallbackSecret,
  encryptCallbackSecret,
  generateCallbackSecret,
  keyId,
} from './callback-secret'

describe('callback secret', () => {
  test('generates distinct prefixed secrets', () => {
    const a = generateCallbackSecret()
    expect(a).toMatch(/^whsec_[A-Za-z0-9_-]{40,}$/)
    expect(generateCallbackSecret()).not.toBe(a)
  })

  test('round-trips and never stores plaintext', () => {
    const secret = generateCallbackSecret()
    const stored = encryptCallbackSecret(secret, 'k1')
    expect(stored).not.toContain(secret)
    expect(stored).toMatch(/^k1\.[0-9a-f]{8}\.v1:/)
    expect(decryptCallbackSecret(stored, 'k1')).toBe(secret)
  })

  test('uses a fresh IV per encryption', () => {
    expect(encryptCallbackSecret('s', 'k')).not.toBe(encryptCallbackSecret('s', 'k'))
  })

  test('returns null for a wrong key, tampering or malformed input', () => {
    const stored = encryptCallbackSecret('hello', 'k1')
    expect(decryptCallbackSecret(stored, 'k2')).toBeNull()
    const parts = stored.split(':')
    parts[3] = Buffer.from('tampered').toString('base64url')
    expect(decryptCallbackSecret(parts.join(':'), 'k1')).toBeNull()
    expect(decryptCallbackSecret('garbage', 'k1')).toBeNull()
    expect(decryptCallbackSecret('v2:a:b:c', 'k1')).toBeNull()
  })
})

describe('callback secret key ids', () => {
  // The format used before key ids existed: no `k1.<kid>.` prefix.
  const legacy = (plaintext: string, key: string) => {
    const iv = randomBytes(12)
    const cipher = createCipheriv(
      'aes-256-gcm',
      createHash('sha256').update(key, 'utf8').digest(),
      iv
    )
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    return [
      'v1',
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      ct.toString('base64url'),
    ].join(':')
  }

  test('the kid is the first 8 hex chars of SHA-256 of the key', () => {
    const kid = createHash('sha256').update('key-a', 'utf8').digest('hex').slice(0, 8)
    expect(keyId('key-a')).toBe(kid)
    expect(encryptCallbackSecret('x', 'key-a').startsWith(`k1.${kid}.v1:`)).toBe(true)
  })

  test('decrypts with whichever key matches the kid', () => {
    const oldStored = encryptCallbackSecret('s-old', 'key-old')
    const keys = { current: 'key-new', previous: 'key-old' }
    expect(decryptCallbackSecret(oldStored, keys)).toBe('s-old')
    expect(decryptCallbackSecret(encryptCallbackSecret('s-new', 'key-new'), keys)).toBe('s-new')
  })

  test('a kid that matches no configured key fails without trying others', () => {
    expect(
      decryptCallbackSecret(encryptCallbackSecret('s', 'key-gone'), {
        current: 'key-new',
        previous: 'key-old',
      })
    ).toBeNull()
    expect(
      decryptCallbackSecret(encryptCallbackSecret('s', 'key-old'), { current: 'key-new' })
    ).toBeNull()
  })

  test('values stored before key ids try the current key, then the previous one', () => {
    expect(decryptCallbackSecret(legacy('s1', 'key-new'), { current: 'key-new' })).toBe('s1')
    expect(
      decryptCallbackSecret(legacy('s2', 'key-old'), { current: 'key-new', previous: 'key-old' })
    ).toBe('s2')
    expect(
      decryptCallbackSecret(legacy('s3', 'key-x'), { current: 'key-new', previous: 'key-old' })
    ).toBeNull()
  })

  test('encryption always uses the current key', () => {
    const stored = encryptCallbackSecret('s', 'key-new')
    expect(decryptCallbackSecret(stored, { current: 'key-new', previous: 'key-old' })).toBe('s')
    expect(decryptCallbackSecret(stored, { current: 'key-old' })).toBeNull()
  })
})
