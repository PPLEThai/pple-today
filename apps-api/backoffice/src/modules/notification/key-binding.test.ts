import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { MiniAppSource } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { requireAppBoundKey, requireUnboundKey } from './key-binding'

const unbound = { miniApp: null }
const builderApp = { miniApp: { source: MiniAppSource.PLATFORM } }
const centralTeamApp = { miniApp: { source: MiniAppSource.ADMIN } }

describe('requireUnboundKey', () => {
  describe('legacy central-team keys are unchanged', () => {
    test('a key with no app binding is allowed to target recipients directly', () => {
      // The regression that matters: every key that existed before app binding
      // has no binding at all, and must keep working exactly as it did.
      expect(requireUnboundKey(unbound).isOk()).toBe(true)
    })
  })

  describe('what the key may do follows the app it speaks for', () => {
    test('a key bound to a central-team app may still target recipients', () => {
      // Binding is attribution, not audience restriction. A vetted central-team
      // app takes a bound key purely so its notifications carry its identity;
      // refusing it here would make attribution cost the capability.
      expect(requireUnboundKey(centralTeamApp).isOk()).toBe(true)
    })

    test('a key bound to a Builder App is refused', () => {
      const result = requireUnboundKey(builderApp)

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_KEY_APP_BOUND)
    })

    test('the refusal points at the audience-bound path', () => {
      // A Builder App hitting this endpoint has made an honest mistake; the
      // error has to name the path that will actually work for them.
      const result = requireUnboundKey(builderApp)

      expect(result._unsafeUnwrapErr().message).toContain('POST /external/notifications')
    })
  })
})

describe('requireAppBoundKey', () => {
  test('a bound key passes and carries its app forward', () => {
    const result = requireAppBoundKey({ id: 'key-1', miniApp: { source: MiniAppSource.PLATFORM } })

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

  test('an unbound key is locked out of exactly one path, and a Builder key out of the other', () => {
    // No key is accepted by both, and none is locked out of both.
    expect(requireUnboundKey(unbound).isOk()).toBe(!requireAppBoundKey(unbound).isOk())
    expect(requireUnboundKey(builderApp).isOk()).toBe(!requireAppBoundKey(builderApp).isOk())
  })
})
