import { Check } from '@sinclair/typebox/value'
import { describe, expect, test } from 'vitest'

import {
  CountAppInstallBody,
  CreateAppNotificationBody,
  MAX_APP_INSTALL_COUNT_PHONE_NUMBERS,
} from './models'

const content = { header: 'Canvassing today', message: 'Three streets left' }
const accepts = (body: unknown) => Check(CreateAppNotificationBody, body)

/**
 * The audience-bound send body, at the wire boundary.
 *
 * These are the guarantees that have to hold *before* any handler code runs —
 * a body the schema lets through with no audience would already be a bug by the
 * time anything else could refuse it.
 */
describe('CreateAppNotificationBody', () => {
  test('accepts a send to the whole audience', () => {
    expect(accepts({ audience: { kind: 'all' }, content })).toBe(true)
  })

  test('accepts a send naming recipients by sub or phone', () => {
    expect(
      accepts({
        audience: { kind: 'direct', recipients: [{ sub: 'a-sub' }, { phone: '0812345678' }] },
        content,
      })
    ).toBe(true)
  })

  test('accepts an optional idempotency key', () => {
    expect(accepts({ audience: { kind: 'all' }, content, idempotencyKey: 'retry-1' })).toBe(true)
  })

  test('rejects a body with no audience at all', () => {
    // The one that matters: a dropped field must not be able to turn a message
    // meant for one person into a message to everyone. Required, from day one —
    // there is no lenient window and no default.
    expect(accepts({ content })).toBe(false)
  })

  test('rejects an audience kind it does not recognise', () => {
    expect(accepts({ audience: { kind: 'everyone' }, content })).toBe(false)
    expect(accepts({ audience: {}, content })).toBe(false)
  })

  test('rejects a direct send with no recipients field', () => {
    expect(accepts({ audience: { kind: 'direct' }, content })).toBe(false)
  })

  test('rejects a recipient list that is not a list', () => {
    expect(accepts({ audience: { kind: 'direct', recipients: 'a-sub' }, content })).toBe(false)
  })

  /**
   * These reach the handler on purpose. The cap, the non-empty rule and the
   * exactly-one-of rule are enforced together in `canonicalizeRecipients`, which
   * answers 400 for all of them — rather than splitting one contract across two
   * status codes depending on which half of it was broken.
   */
  test.each([
    ['an empty list', []],
    ['an entry naming neither', [{}]],
    ['an entry naming both', [{ sub: 'a-sub', phone: '0812345678' }]],
  ])('passes %s through to the handler, which refuses it', (_name, recipients) => {
    expect(accepts({ audience: { kind: 'direct', recipients }, content })).toBe(true)
  })
})

/**
 * The bulk app-install count body, at the wire boundary. The cap is a schema
 * concern so an oversized call is a 400 before any handler code or query runs.
 */
describe('CountAppInstallBody', () => {
  const acceptsCount = (body: unknown) => Check(CountAppInstallBody, body)
  const numbers = (n: number) => Array.from({ length: n }, () => '0812345678')

  test('accepts both number forms', () => {
    expect(acceptsCount({ phoneNumbers: ['0812345678', '+66812345678'] })).toBe(true)
  })

  test('accepts exactly the cap', () => {
    expect(acceptsCount({ phoneNumbers: numbers(MAX_APP_INSTALL_COUNT_PHONE_NUMBERS) })).toBe(true)
  })

  test('rejects a list over the cap', () => {
    expect(acceptsCount({ phoneNumbers: numbers(MAX_APP_INSTALL_COUNT_PHONE_NUMBERS + 1) })).toBe(
      false
    )
  })

  test('rejects an empty list and a missing field', () => {
    expect(acceptsCount({ phoneNumbers: [] })).toBe(false)
    expect(acceptsCount({})).toBe(false)
  })

  test('rejects entries that are not strings', () => {
    expect(acceptsCount({ phoneNumbers: [812345678] })).toBe(false)
  })

  // Malformed strings are counted under `invalid` by the service, not refused
  // here — one bad row in an audience export must not sink the whole preview.
  test('passes a malformed string through to be counted as invalid', () => {
    expect(acceptsCount({ phoneNumbers: ['not-a-number'] })).toBe(true)
  })
})
