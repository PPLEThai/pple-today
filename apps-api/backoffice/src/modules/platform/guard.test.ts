import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { describe, expect, test } from 'vitest'

import { PlatformAuthGuard } from './guard'

describe('PlatformAuthGuard.authenticate', () => {
  test('accepts the configured service token presented as a bearer', () => {
    const guard = new PlatformAuthGuard('s3cr3t')

    expect(guard.authenticate({ authorization: 'Bearer s3cr3t' }).isOk()).toBe(true)
  })

  test('rejects a mismatched token', () => {
    const guard = new PlatformAuthGuard('s3cr3t')

    const result = guard.authenticate({ authorization: 'Bearer wrong' })

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.UNAUTHORIZED)
  })

  test('rejects a request with no authorization header', () => {
    const guard = new PlatformAuthGuard('s3cr3t')

    expect(guard.authenticate({}).isErr()).toBe(true)
  })

  test('rejects an admin/user bearer token — only the dedicated service token is accepted', () => {
    // The platform token is separate from admin/user auth: an admin token (or
    // any other bearer that is not the configured service token) is rejected.
    const guard = new PlatformAuthGuard('platform-service-token')

    const result = guard.authenticate({ authorization: 'Bearer an-admin-users-oidc-token' })

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.UNAUTHORIZED)
  })

  test('rejects every request when no service token is configured, even a bearer', () => {
    const guard = new PlatformAuthGuard(undefined)

    expect(guard.authenticate({ authorization: 'Bearer anything' }).isErr()).toBe(true)
    expect(guard.authenticate({ authorization: 'Bearer ' }).isErr()).toBe(true)
  })
})
