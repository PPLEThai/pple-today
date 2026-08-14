import { Check } from '@sinclair/typebox/value'
import { describe, expect, test } from 'vitest'

import { CreateAppNotificationBody } from './models'

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
