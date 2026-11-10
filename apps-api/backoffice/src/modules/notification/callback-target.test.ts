import { MiniAppSource } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { encryptCallbackSecret } from './callback-secret'
import {
  buildPlatformRelayUrl,
  isBlockedIp,
  resolveCallbackTarget,
  resolvePublicAddress,
  validateCallbackUrl,
} from './callback-target'

describe('isBlockedIp', () => {
  test.each([
    '0.0.0.0',
    '10.1.2.3',
    '100.64.0.1',
    '100.127.255.255',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '192.0.2.5',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:a00:1',
    '::ffff:169.254.169.254',
    '64:ff9b::7f00:1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
    '2002:7f00:1::1',
    'not-an-ip',
  ])('blocks %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true)
  })

  test.each([
    '8.8.8.8',
    '1.1.1.1',
    '100.63.255.255',
    '100.128.0.1',
    '172.15.0.1',
    '172.32.0.1',
    '203.0.114.1',
    '::ffff:8.8.8.8',
    '2606:4700:4700::1111',
    '2001:4860:4860::8888',
  ])('allows %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(false)
  })
})

describe('validateCallbackUrl', () => {
  test('accepts a public https URL', () => {
    const r = validateCallbackUrl('https://hooks.example.com/pple?x=1')
    expect(r.ok).toBe(true)
  })

  test.each([
    ['http://example.com/hook', 'https'],
    ['ftp://example.com', 'https'],
    ['not a url', 'valid'],
    ['https://user:pass@example.com/', 'credentials'],
    ['https://localhost/hook', 'internal'],
    ['https://svc.internal/hook', 'internal'],
    ['https://printer.local/hook', 'internal'],
    ['https://127.0.0.1/hook', 'private'],
    ['https://169.254.169.254/latest/meta-data', 'private'],
    ['https://[::1]/hook', 'private'],
    ['https://[fd00::1]/hook', 'private'],
    ['https://[::ffff:10.0.0.1]/hook', 'private'],
    ['https://2130706433/hook', 'private'], // decimal 127.0.0.1, normalised by URL
  ])('rejects %s', (raw, reason) => {
    const r = validateCallbackUrl(raw)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason.toLowerCase()).toContain(reason)
  })
})

describe('resolvePublicAddress', () => {
  const url = new URL('https://hooks.example.com/x')

  test('pins the first public address', async () => {
    const r = await resolvePublicAddress(url, async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800::1', family: 6 },
    ])
    expect(r).toEqual({ ok: true, pinned: { address: '93.184.216.34', family: 4 } })
  })

  test('refuses when any address is private', async () => {
    const r = await resolvePublicAddress(url, async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ])
    expect(r.ok).toBe(false)
  })

  test('refuses unresolvable hosts', async () => {
    expect(
      (
        await resolvePublicAddress(url, async () => {
          throw new Error('ENOTFOUND')
        })
      ).ok
    ).toBe(false)
    expect((await resolvePublicAddress(url, async () => [])).ok).toBe(false)
  })

  test('does not consult DNS for a literal public IP, and refuses a private one', async () => {
    const lookup = async () => {
      throw new Error('should not be called')
    }
    expect(await resolvePublicAddress(new URL('https://8.8.8.8/'), lookup)).toEqual({
      ok: true,
      pinned: { address: '8.8.8.8', family: 4 },
    })
    expect((await resolvePublicAddress(new URL('https://10.0.0.1/'), lookup)).ok).toBe(false)
  })
})

describe('buildPlatformRelayUrl', () => {
  test('joins base and slug without a double slash', () => {
    expect(buildPlatformRelayUrl('https://relay.example/', 'leave-request')).toBe(
      'https://relay.example/apps/leave-request/notification-response'
    )
  })
})

describe('resolveCallbackTarget', () => {
  const KEY = 'test-key'
  const publicLookup = async () => [{ address: '93.184.216.34', family: 4 as const }]
  const adminApp = {
    slug: 'leave',
    source: MiniAppSource.ADMIN,
    notificationCallbackUrl: 'https://hooks.example.com/pple',
    notificationCallbackSecret: encryptCallbackSecret('whsec_abc', KEY),
  }

  test('ADMIN: decrypts the secret, pins the address', async () => {
    const r = await resolveCallbackTarget(adminApp, { secretKey: KEY }, publicLookup)
    expect(r).toMatchObject({
      ok: true,
      target: {
        kind: 'ADMIN',
        url: 'https://hooks.example.com/pple',
        signingSecret: 'whsec_abc',
        pinned: { address: '93.184.216.34' },
      },
    })
  })

  test('ADMIN: refuses without URL, secret, key or with a bad secret', async () => {
    const cfg = { secretKey: KEY }
    expect(
      (await resolveCallbackTarget({ ...adminApp, notificationCallbackUrl: null }, cfg)).ok
    ).toBe(false)
    expect(
      (await resolveCallbackTarget({ ...adminApp, notificationCallbackSecret: null }, cfg)).ok
    ).toBe(false)
    expect((await resolveCallbackTarget(adminApp, {}, publicLookup)).ok).toBe(false)
    expect((await resolveCallbackTarget(adminApp, { secretKey: 'other' }, publicLookup)).ok).toBe(
      false
    )
  })

  test('ADMIN: re-checks the URL and DNS at send time', async () => {
    const cfg = { secretKey: KEY }
    const http = { ...adminApp, notificationCallbackUrl: 'http://hooks.example.com/pple' }
    expect((await resolveCallbackTarget(http, cfg, publicLookup)).ok).toBe(false)
    const rebound = await resolveCallbackTarget(adminApp, cfg, async () => [
      { address: '127.0.0.1', family: 4 },
    ])
    expect(rebound.ok).toBe(false)
  })

  test('PLATFORM: relay URL with bearer, no signature, ignores the stored URL', async () => {
    const r = await resolveCallbackTarget(
      { ...adminApp, source: MiniAppSource.PLATFORM, slug: 'my-app' },
      { platformRelayUrl: 'https://relay.example', platformRelayToken: 'tok' }
    )
    expect(r).toEqual({
      ok: true,
      target: {
        kind: 'PLATFORM',
        url: 'https://relay.example/apps/my-app/notification-response',
        headers: { Authorization: 'Bearer tok' },
      },
    })
  })

  test('PLATFORM: refuses when the relay is not configured', async () => {
    const r = await resolveCallbackTarget(
      { ...adminApp, source: MiniAppSource.PLATFORM },
      { platformRelayUrl: 'https://relay.example' }
    )
    expect(r.ok).toBe(false)
  })
})
