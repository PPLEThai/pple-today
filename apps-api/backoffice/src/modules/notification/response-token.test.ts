import { createHmac } from 'node:crypto'

import { describe, expect, test } from 'vitest'

import {
  deviceHash,
  mintResponseToken,
  responseTokenKeyId,
  verifyResponseToken as verify,
} from './response-token'

const SECRET = 'test-secret'
const NOW = new Date('2026-11-10T00:00:00Z')
const EXP = Math.floor(NOW.getTime() / 1000) + 3600
const DEVICE = deviceHash('fcm-token-1')
const claims = { notificationId: 'clw1', userId: 'usr1', exp: EXP, deviceHash: DEVICE }

const verifyResponseToken = (token: string, secret: string | string[], now: Date) =>
  verify(token, Array.isArray(secret) ? secret : [secret], now)

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
    const forged = Buffer.from(
      JSON.stringify({ n: 'clw2', u: 'usr1', e: EXP, d: DEVICE, k: responseTokenKeyId(SECRET) })
    ).toString('base64url')
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
    const payload = Buffer.from(
      JSON.stringify({ n: 1, u: 'x', e: 'y', d: 'z', k: responseTokenKeyId(SECRET) })
    ).toString('base64url')
    const sig = createHmac('sha256', SECRET).update(`v1.${payload}`).digest('base64url')
    expect(verifyResponseToken(`v1.${payload}.${sig}`, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'malformed',
    })
  })

  test('carries the device and key id claims', () => {
    const [, payload] = mintResponseToken(claims, SECRET).split('.')
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toEqual({
      n: 'clw1',
      u: 'usr1',
      e: EXP,
      d: DEVICE,
      k: responseTokenKeyId(SECRET),
    })
  })

  test('deviceHash is 16 bytes of SHA-256, base64url, and differs per token', () => {
    expect(DEVICE).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(deviceHash('fcm-token-2')).not.toBe(DEVICE)
    expect(deviceHash('fcm-token-1')).toBe(DEVICE)
  })

  test('key id is 8 hex chars and differs per secret', () => {
    expect(responseTokenKeyId(SECRET)).toMatch(/^[0-9a-f]{8}$/)
    expect(responseTokenKeyId('other')).not.toBe(responseTokenKeyId(SECRET))
  })

  test('verifies with the previous key, picked by key id', () => {
    const old = mintResponseToken(claims, 'old-secret')
    expect(verifyResponseToken(old, [SECRET, 'old-secret'], NOW)).toEqual({ ok: true, ...claims })
    expect(verifyResponseToken(old, [SECRET], NOW)).toEqual({ ok: false, reason: 'signature' })
  })

  test('mints with the first (current) key', () => {
    const fresh = mintResponseToken(claims, SECRET)
    expect(verifyResponseToken(fresh, ['old-secret'], NOW).ok).toBe(false)
    expect(verifyResponseToken(fresh, [SECRET, 'old-secret'], NOW).ok).toBe(true)
  })

  test('a kid naming a key with a forged signature is rejected', () => {
    const [v, payload] = mintResponseToken(claims, 'old-secret').split('.')
    const forged = createHmac('sha256', SECRET).update(`${v}.${payload}`).digest('base64url')
    expect(verifyResponseToken(`${v}.${payload}.${forged}`, [SECRET, 'old-secret'], NOW)).toEqual({
      ok: false,
      reason: 'signature',
    })
  })

  test('rejects a token without the d or k claim', () => {
    const payload = Buffer.from(JSON.stringify({ n: 'a', u: 'b', e: EXP })).toString('base64url')
    const sig = createHmac('sha256', SECRET).update(`v1.${payload}`).digest('base64url')
    expect(verifyResponseToken(`v1.${payload}.${sig}`, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'malformed',
    })
  })
})
