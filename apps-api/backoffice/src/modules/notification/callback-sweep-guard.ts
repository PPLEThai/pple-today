import { createHash, timingSafeEqual } from 'node:crypto'

import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import { ok } from 'neverthrow'

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest()

/**
 * Authenticates the gitops CronJob that drives the callback sweep: a single
 * shared bearer token (`NOTIFICATION_CALLBACK_SWEEP_TOKEN`), the same pattern as
 * the `/platform` service token. Unset token = every request rejected.
 * Free of Elysia/config imports so it can be unit-tested directly.
 */
export class CallbackSweepAuthGuard {
  constructor(private readonly token: string | undefined) {}

  authenticate(headers: Record<string, string | undefined>) {
    const presented = headers['authorization']?.replace(/^Bearer\s+/i, '').trim()
    const valid =
      !!this.token &&
      !!presented &&
      // Compare fixed-length digests: `timingSafeEqual` throws on unequal byte
      // lengths, and equal character counts can differ in bytes (non-ASCII).
      timingSafeEqual(sha256(presented), sha256(this.token))

    if (!valid) {
      return err({
        code: InternalErrorCode.UNAUTHORIZED,
        message: 'Invalid sweep token',
      })
    }
    return ok()
  }
}
