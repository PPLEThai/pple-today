import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { describe, expect, test } from 'vitest'

import { requireAppBoundKey, requireUnboundKey } from './key-binding'

describe('requireUnboundKey', () => {
  describe('legacy central-team keys are unchanged', () => {
    test('a key with no app binding is allowed to target recipients directly', () => {
      // The regression that matters: every key that existed before app binding
      // has miniAppId = null, and must keep working exactly as it did.
      expect(requireUnboundKey({ miniAppId: null }).isOk()).toBe(true)
    })
  })

  describe('app-bound keys cannot target recipients', () => {
    test('a bound key is refused, whichever app it belongs to', () => {
      const result = requireUnboundKey({ miniAppId: 'mini-app-id' })

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_KEY_APP_BOUND)
    })

    test('the refusal points at the audience-bound path', () => {
      // A Builder App hitting this endpoint has made an honest mistake; the
      // error has to name the path that will actually work for them.
      const result = requireUnboundKey({ miniAppId: 'mini-app-id' })

      expect(result._unsafeUnwrapErr().message).toContain('POST /external/notifications')
    })
  })
})

describe('requireAppBoundKey', () => {
  test('a bound key passes and carries its binding forward', () => {
    const result = requireAppBoundKey({ id: 'key-1', miniAppId: 'mini-app-id' })

    // Narrowed to a non-null miniAppId, so the caller never re-checks it.
    expect(result._unsafeUnwrap().miniAppId).toBe('mini-app-id')
  })

  test('a legacy key has no audience to resolve and is refused', () => {
    const result = requireAppBoundKey({ miniAppId: null })

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_KEY_NOT_APP_BOUND)
  })

  test('the two guards are exact mirrors of each other', () => {
    // Every key is admitted by exactly one path — no key is accepted by both,
    // and none is locked out of both.
    for (const key of [{ miniAppId: null }, { miniAppId: 'mini-app-id' }]) {
      expect(requireUnboundKey(key).isOk()).toBe(!requireAppBoundKey(key).isOk())
    }
  })
})
