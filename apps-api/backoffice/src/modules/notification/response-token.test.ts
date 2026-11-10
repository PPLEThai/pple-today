import { createHmac } from 'node:crypto'

import { describe, expect, test } from 'vitest'

import { mintResponseToken, verifyResponseToken } from './response-token'

const SECRET = 'test-secret'
const NOW = new Date('2026-11-10T00:00:00Z')
const EXP = Math.floor(NOW.getTime() / 1000) + 3600
const claims = { notificationId: 'clw1', userId: 'usr1', exp: EXP }

describe('response token', () => {
  test('round-trips', () => {
    const token = mintResponseToken(claims, SECRET)
    expect(token.startsWith('v1.')).toBe(true)
    expect(token.split('.')).toHaveLength(3)
    expect(verifyResponseToken(token, SECRET, NOW)).toEqual({ ok: true, ...claims })
  })

  test('is url-safe and small', () => {
    const token = mintResponseToken(claims, SECRET)
    expect(token).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(token.length).toBeLessThan(200)
  })

  test('rejects a wrong secret', () => {
    const token = mintResponseToken(claims, SECRET)
    expect(verifyResponseToken(token, 'other', NOW)).toEqual({ ok: false, reason: 'signature' })
  })

  test('rejects a tampered payload', () => {
    const token = mintResponseToken(claims, SECRET)
    const [v, , sig] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ n: 'clw2', u: 'usr1', e: EXP })).toString(
      'base64url'
    )
    expect(verifyResponseToken(`${v}.${forged}.${sig}`, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'signature',
    })
  })

  test('rejects a tampered signature', () => {
    const token = mintResponseToken(claims, SECRET)
    expect(verifyResponseToken(token.slice(0, -2) + 'AA', SECRET, NOW).ok).toBe(false)
  })

  test('rejects when expired, at the exact expiry second', () => {
    const token = mintResponseToken(claims, SECRET)
    expect(verifyResponseToken(token, SECRET, new Date((EXP - 1) * 1000)).ok).toBe(true)
    expect(verifyResponseToken(token, SECRET, new Date(EXP * 1000))).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  test.each(['', 'garbage', 'v1.a', 'v2.a.b', 'v1..b', 'v1.a.b.c'])('rejects malformed %j', (t) => {
    expect(verifyResponseToken(t, SECRET, NOW)).toEqual({ ok: false, reason: 'malformed' })
  })

  test('rejects a validly signed payload with the wrong claim types', () => {
    const payload = Buffer.from(JSON.stringify({ n: 1, u: 'x', e: 'y' })).toString('base64url')
    const sig = createHmac('sha256', SECRET).update(`v1.${payload}`).digest('base64url')
    expect(verifyResponseToken(`v1.${payload}.${sig}`, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'malformed',
    })
  })
})
