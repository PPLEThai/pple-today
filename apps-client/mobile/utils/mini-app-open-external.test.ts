import { describe, expect, it } from 'vitest'

import {
  checkExternalUrl,
  isInOpenExternalCooldown,
  OPEN_EXTERNAL_COOLDOWN_MS,
  OPEN_EXTERNAL_MAX_URL_LENGTH,
  parseOpenExternalRequest,
} from './mini-app-open-external'

const message = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: 'pple:open-external-request',
    version: 1,
    requestId: 'r1',
    url: 'https://meet.example.com/abc-defg-hij',
    ...overrides,
  })

describe('checkExternalUrl', () => {
  it('takes https, mailto and tel URLs', () => {
    expect(checkExternalUrl('https://meet.example.com/abc?x=1#y')).toBe(
      'https://meet.example.com/abc?x=1#y'
    )
    expect(checkExternalUrl('mailto:someone@example.com')).toBe('mailto:someone@example.com')
    expect(checkExternalUrl('tel:+6621234567')).toBe('tel:+6621234567')
    expect(checkExternalUrl('HTTPS://Meet.Example.com')).toBe('https://meet.example.com/')
  })

  it('refuses other schemes, relative URLs and credentials', () => {
    for (const url of [
      'http://meet.example.com',
      'javascript:alert(1)',
      'data:text/html,hi',
      'file:///etc/passwd',
      'intent://scan/#Intent;scheme=zxing;end',
      'fb://profile',
      '/relative',
      'meet.example.com',
      '',
      'https://user:pass@meet.example.com',
      'https://evil.example.com@pplethai.org.evil.com',
    ]) {
      expect(checkExternalUrl(url)).toBeNull()
    }
  })

  it('refuses a non-string or an overly long URL', () => {
    expect(checkExternalUrl(undefined)).toBeNull()
    expect(checkExternalUrl(42)).toBeNull()
    const long = `https://example.com/${'a'.repeat(OPEN_EXTERNAL_MAX_URL_LENGTH)}`
    expect(checkExternalUrl(long)).toBeNull()
  })
})

describe('parseOpenExternalRequest', () => {
  it('reads a request', () => {
    expect(parseOpenExternalRequest(message())).toEqual({
      requestId: 'r1',
      ok: true,
      url: 'https://meet.example.com/abc-defg-hij',
    })
  })

  it('answers a URL it will not open with invalid-url', () => {
    expect(parseOpenExternalRequest(message({ url: 'javascript:alert(1)' }))).toEqual({
      requestId: 'r1',
      ok: false,
      reason: 'invalid-url',
    })
    expect(parseOpenExternalRequest(message({ url: undefined }))).toEqual({
      requestId: 'r1',
      ok: false,
      reason: 'invalid-url',
    })
  })

  it('ignores what is not a request, or has no id to answer', () => {
    expect(parseOpenExternalRequest('not json')).toBeNull()
    expect(parseOpenExternalRequest({})).toBeNull()
    expect(parseOpenExternalRequest(message({ type: 'pple:save-file-request' }))).toBeNull()
    expect(parseOpenExternalRequest(message({ version: 2 }))).toBeNull()
    expect(parseOpenExternalRequest(message({ requestId: '' }))).toBeNull()
    expect(parseOpenExternalRequest(message({ requestId: 'x'.repeat(257) }))).toBeNull()
  })
})

describe('isInOpenExternalCooldown', () => {
  it('holds requests off for a second after an open', () => {
    expect(isInOpenExternalCooldown(null, 1_000)).toBe(false)
    expect(isInOpenExternalCooldown(1_000, 1_000 + OPEN_EXTERNAL_COOLDOWN_MS - 1)).toBe(true)
    expect(isInOpenExternalCooldown(1_000, 1_000 + OPEN_EXTERNAL_COOLDOWN_MS)).toBe(false)
  })
})
