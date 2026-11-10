import { timingSafeEqual } from 'node:crypto'

import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import { ok } from 'neverthrow'

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
      presented.length === this.token.length &&
      timingSafeEqual(Buffer.from(presented), Buffer.from(this.token))

    if (!valid) {
      return err({
        code: InternalErrorCode.UNAUTHORIZED,
        message: 'Invalid sweep token',
      })
    }
    return ok()
  }
}
