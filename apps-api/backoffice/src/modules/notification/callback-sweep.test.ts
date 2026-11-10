import { describe, expect, test } from 'vitest'

import { CallbackSweepAuthGuard } from './callback-sweep-guard'

describe('CallbackSweepAuthGuard', () => {
  const guard = new CallbackSweepAuthGuard('s3cret-token')

  test('accepts the configured bearer token', () => {
    expect(guard.authenticate({ authorization: 'Bearer s3cret-token' }).isOk()).toBe(true)
  })

  test.each([
    [{}],
    [{ authorization: 'Bearer wrong-token!' }],
    [{ authorization: 'Bearer s3cret' }],
    [{ authorization: 's3cret-tokenX' }],
    [{ authorization: 'Bearer ' }],
  ])('rejects %j', (headers) => {
    expect(guard.authenticate(headers).isErr()).toBe(true)
  })

  test('rejects everything when no token is configured', () => {
    const open = new CallbackSweepAuthGuard(undefined)
    expect(open.authenticate({ authorization: 'Bearer ' }).isErr()).toBe(true)
    expect(open.authenticate({ authorization: 'Bearer undefined' }).isErr()).toBe(true)
    expect(open.authenticate({}).isErr()).toBe(true)
  })
})
