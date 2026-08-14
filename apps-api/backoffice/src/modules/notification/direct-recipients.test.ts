import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { describe, expect, test } from 'vitest'

import {
  canonicalizeRecipients,
  MAX_DIRECT_RECIPIENTS,
  settleDirectDelivery,
} from './direct-recipients'

const ALICE = 'alice-sub'
const BOB = 'bob-sub'

describe('canonicalizeRecipients', () => {
  test('a `sub` entry is looked up by sub', () => {
    const result = canonicalizeRecipients([{ sub: ALICE }])

    expect(result._unsafeUnwrap()).toEqual([
      { named: { sub: ALICE }, lookup: { by: 'sub', sub: ALICE } },
    ])
  })

  test('domestic and E.164 spellings of one number canonicalise to the same lookup', () => {
    const result = canonicalizeRecipients([{ phone: '0812345678' }, { phone: '+66812345678' }])

    const [domestic, e164] = result._unsafeUnwrap()
    expect(domestic.lookup).toEqual({ by: 'phone', phone: '+66812345678' })
    expect(e164.lookup).toEqual(domestic.lookup)
  })

  test('the entry is kept exactly as named, so the response can echo it back', () => {
    const result = canonicalizeRecipients([{ phone: '0812345678' }])

    expect(result._unsafeUnwrap()[0].named).toEqual({ phone: '0812345678' })
  })

  test('a phone that is not a whole Thai mobile number is looked up as nothing at all', () => {
    // Not an error: an unparseable number is indistinguishable from a number no
    // account holds, and the two must stay indistinguishable (both are
    // `not_reachable`). Kept as an entry so it is still echoed and still costs.
    const result = canonicalizeRecipients([{ phone: '12345' }])

    expect(result._unsafeUnwrap()).toEqual([{ named: { phone: '12345' }, lookup: null }])
  })

  test('an empty recipient list is refused rather than treated as a no-op', () => {
    const result = canonicalizeRecipients([])

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS)
  })

  test('a list over the cap is refused rather than silently truncated', () => {
    const overCap = Array.from({ length: MAX_DIRECT_RECIPIENTS + 1 }, (_, i) => ({
      sub: `sub-${i}`,
    }))

    const result = canonicalizeRecipients(overCap)

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS)
  })

  test('a list exactly at the cap is accepted', () => {
    const atCap = Array.from({ length: MAX_DIRECT_RECIPIENTS }, (_, i) => ({ sub: `sub-${i}` }))

    expect(canonicalizeRecipients(atCap).isOk()).toBe(true)
  })

  test('an entry naming neither sub nor phone is refused', () => {
    expect(canonicalizeRecipients([{}])._unsafeUnwrapErr().code).toBe(
      InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS
    )
  })

  test('an entry naming both sub and phone is refused', () => {
    // Which one wins would be a rule nobody remembers, and disagreeing halves
    // would let a caller probe whether they name the same person.
    const result = canonicalizeRecipients([{ sub: ALICE, phone: '0812345678' }])

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS)
  })

  test('an entry with a blank identifier is refused rather than resolving to nobody', () => {
    expect(canonicalizeRecipients([{ sub: '  ' }])._unsafeUnwrapErr().code).toBe(
      InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS
    )
  })

  test('one bad entry refuses the whole call, so nothing is partially delivered', () => {
    const result = canonicalizeRecipients([{ sub: ALICE }, {}, { sub: BOB }])

    expect(result.isErr()).toBe(true)
  })
})

const settle = (
  recipients: Parameters<typeof canonicalizeRecipients>[0],
  reach: { reachable?: string[]; subByPhone?: Record<string, string> } = {}
) =>
  settleDirectDelivery(canonicalizeRecipients(recipients)._unsafeUnwrap(), {
    reachable: new Set(reach.reachable ?? []),
    subByPhone: new Map(Object.entries(reach.subByPhone ?? {})),
  })

describe('settleDirectDelivery', () => {
  test('a named person inside the audience is delivered to', () => {
    const settlement = settle([{ sub: ALICE }], { reachable: [ALICE] })

    expect(settlement.results).toEqual([{ recipient: { sub: ALICE }, status: 'delivered' }])
    expect(settlement.deliverTo).toEqual([ALICE])
  })

  test('a phone resolves through the app’s own users', () => {
    const settlement = settle([{ phone: '0812345678' }], {
      reachable: [ALICE],
      subByPhone: { '+66812345678': ALICE },
    })

    expect(settlement.results).toEqual([
      { recipient: { phone: '0812345678' }, status: 'delivered' },
    ])
    expect(settlement.deliverTo).toEqual([ALICE])
  })

  test('every way of being unreachable collapses to the one status', () => {
    // No PPLE ID account, an account that never opened this app, someone
    // outside the current tier audience — the response must not tell them apart.
    const settlement = settle(
      [{ sub: 'no-such-account' }, { phone: '0899999999' }, { phone: '12345' }],
      { reachable: [ALICE] }
    )

    expect(settlement.results.map((result) => result.status)).toEqual([
      'not_reachable',
      'not_reachable',
      'not_reachable',
    ])
    expect(settlement.deliverTo).toEqual([])
  })

  test('results come back in the order they were named, one per entry', () => {
    const settlement = settle([{ sub: BOB }, { sub: ALICE }, { sub: 'stranger' }], {
      reachable: [ALICE, BOB],
    })

    expect(settlement.results).toEqual([
      { recipient: { sub: BOB }, status: 'delivered' },
      { recipient: { sub: ALICE }, status: 'delivered' },
      { recipient: { sub: 'stranger' }, status: 'not_reachable' },
    ])
  })

  describe('de-duplication happens after resolution, before metering', () => {
    test('two spellings of one person are one delivery and one unit', () => {
      const settlement = settle([{ sub: ALICE }, { phone: '0812345678' }], {
        reachable: [ALICE],
        subByPhone: { '+66812345678': ALICE },
      })

      // Both entries are answered — the caller named two — but the person is
      // notified once and charged once.
      expect(settlement.results.map((result) => result.status)).toEqual(['delivered', 'delivered'])
      expect(settlement.deliverTo).toEqual([ALICE])
      expect(settlement.units).toBe(1)
    })

    test('entries resolving to nobody are counted individually', () => {
      const settlement = settle([{ sub: 'ghost' }, { sub: 'ghost' }], { reachable: [ALICE] })

      expect(settlement.units).toBe(2)
    })

    test('a send debits the reach it requests, not the reach it achieves', () => {
      const settlement = settle([{ sub: ALICE }, { sub: 'ghost' }], { reachable: [ALICE] })

      expect(settlement.deliverTo).toEqual([ALICE])
      expect(settlement.units).toBe(2)
    })
  })

  describe('the per-call audit', () => {
    test('records how many were named, how many were reached, and the ratio', () => {
      const settlement = settle(
        [{ sub: ALICE }, { sub: BOB }, { sub: 'ghost' }, { sub: 'ghost' }],
        {
          reachable: [ALICE, BOB],
        }
      )

      expect(settlement.audit).toEqual({ named: 4, delivered: 2, matchRatio: 0.5 })
    })

    test('counts distinct people delivered to, not entries that named them', () => {
      const settlement = settle([{ sub: ALICE }, { sub: ALICE }], { reachable: [ALICE] })

      expect(settlement.audit).toEqual({ named: 2, delivered: 1, matchRatio: 0.5 })
    })

    test('reaching nobody is a ratio of zero rather than a division by nothing', () => {
      const settlement = settle([{ sub: 'ghost' }], {})

      expect(settlement.audit).toEqual({ named: 1, delivered: 0, matchRatio: 0 })
    })
  })
})
