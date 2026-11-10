import { describe, expect, test } from 'vitest'

import {
  decryptCallbackSecret,
  encryptCallbackSecret,
  generateCallbackSecret,
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
    expect(stored.startsWith('v1:')).toBe(true)
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
