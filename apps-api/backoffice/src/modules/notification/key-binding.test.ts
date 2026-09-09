import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { MiniAppSource, NotificationApiKeySource } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { isMeteredKey, requireAppBoundKey, requireUnboundKey } from './key-binding'

/** A legacy admin key that speaks for no app. */
const unbound = { source: NotificationApiKeySource.ADMIN, miniApp: null }
/** The key the provisioner hands a Builder along with their app. */
const provisionedKey = {
  source: NotificationApiKeySource.PLATFORM,
  miniApp: { source: MiniAppSource.PLATFORM },
}
/** An admin key bound to a central-team app, purely for attribution. */
const centralTeamApp = {
  source: NotificationApiKeySource.ADMIN,
  miniApp: { source: MiniAppSource.ADMIN },
}
/** An admin key bound to a *Builder* App — the enhanced-audience case. */
const adminKeyOnBuilderApp = {
  source: NotificationApiKeySource.ADMIN,
  miniApp: { source: MiniAppSource.PLATFORM },
}

describe('requireUnboundKey', () => {
  describe('legacy central-team keys are unchanged', () => {
    test('a key with no app binding is allowed to target recipients directly', () => {
      // The regression that matters: every key that existed before app binding
      // has no binding at all, and must keep working exactly as it did.
      expect(requireUnboundKey(unbound).isOk()).toBe(true)
    })
  })

  describe('what the key may do follows who issued it', () => {
    test('a key bound to a central-team app may still target recipients', () => {
      // Binding is attribution, not audience restriction. A vetted central-team
      // app takes a bound key purely so its notifications carry its identity;
      // refusing it here would make attribution cost the capability.
      expect(requireUnboundKey(centralTeamApp).isOk()).toBe(true)
    })

    test('a provisioned Builder key is refused', () => {
      const result = requireUnboundKey(provisionedKey)

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_KEY_APP_BOUND)
    })

    test('the refusal points at the audience-bound path', () => {
      // A Builder App hitting this endpoint has made an honest mistake; the
      // error has to name the path that will actually work for them.
      const result = requireUnboundKey(provisionedKey)

      expect(result._unsafeUnwrapErr().message).toContain('POST /external/notifications')
    })

    test('an admin key bound to a Builder App may target recipients', () => {
      // The reason this is a per-key column rather than a read of
      // `MiniApp.source`: an admin adds a key to a Builder App precisely so the
      // central team can reach that app's users with an audience the Builder
      // itself may not express. Same binding as the key above, opposite answer.
      expect(requireUnboundKey(adminKeyOnBuilderApp).isOk()).toBe(true)
    })
  })
})

describe('requireAppBoundKey', () => {
  test('a bound key passes and carries its app forward', () => {
    const result = requireAppBoundKey({ ...provisionedKey, id: 'key-1' })

    // Narrowed to a non-null app, so the caller never re-checks it.
    expect(result._unsafeUnwrap().miniApp.source).toBe(MiniAppSource.PLATFORM)
  })

  test('a central-team app is welcome here too', () => {
    // The two paths are not a partition any more: a bound central-team key may
    // use either, and picks whichever audience it actually wants.
    expect(requireAppBoundKey(centralTeamApp).isOk()).toBe(true)
  })

  test('a legacy key has no audience to resolve and is refused', () => {
    const result = requireAppBoundKey(unbound)

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_KEY_NOT_APP_BOUND)
  })

  test('an unbound key is locked out of exactly one path, and a provisioned key out of the other', () => {
    // Neither of these is accepted by both, nor locked out of both. Note this is
    // no longer a partition over all keys: an admin key bound to any app may use
    // either path, which is the capability this column exists to grant.
    expect(requireUnboundKey(unbound).isOk()).toBe(!requireAppBoundKey(unbound).isOk())
    expect(requireUnboundKey(provisionedKey).isOk()).toBe(
      !requireAppBoundKey(provisionedKey).isOk()
    )
    expect(requireUnboundKey(adminKeyOnBuilderApp).isOk()).toBe(true)
    expect(requireAppBoundKey(adminKeyOnBuilderApp).isOk()).toBe(true)
  })
})

describe('isMeteredKey', () => {
  test('a provisioned Builder key is metered', () => {
    expect(isMeteredKey(provisionedKey)).toBe(true)
  })

  test('a key bound to a central-team app is not metered', () => {
    // The daily quota is a Builder App Resource Limit, and a central-team app is
    // not an outside Builder.
    expect(isMeteredKey(centralTeamApp)).toBe(false)
  })

  test('an admin key on a Builder App is not metered', () => {
    // The budget belongs to the Builder, and this key is not theirs — charging
    // the central team's sends to it would exhaust a limit they cannot see and
    // did not spend.
    expect(isMeteredKey(adminKeyOnBuilderApp)).toBe(false)
  })

  test('a legacy unbound key is not metered', () => {
    // Unbound keys have never been metered, on either endpoint.
    expect(isMeteredKey(unbound)).toBe(false)
  })

  test('a source this code has not heard of is metered', () => {
    // Metered by default: a new key kind must not quietly arrive with an
    // unlimited send path.
    expect(isMeteredKey({ source: 'FUTURE_SOURCE' as NotificationApiKeySource })).toBe(true)
  })
})
