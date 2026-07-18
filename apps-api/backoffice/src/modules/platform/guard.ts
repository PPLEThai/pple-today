import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import { ok } from 'neverthrow'

/**
 * Authenticates the pple-platform provisioner against the `/platform` service
 * API. This is a service-to-service surface: a single shared bearer token,
 * dedicated to the platform consumer and deliberately separate from the
 * admin/user auth guards, mirroring the `SSO_INTERNAL_TOKEN` pattern.
 *
 * When `PLATFORM_SERVICE_TOKEN` is unset, every request is rejected — an
 * unconfigured deployment exposes nothing rather than defaulting open.
 *
 * The class is kept free of Elysia/config imports so it can be unit-tested
 * without booting the app's config graph; the plugin wiring lives in `index.ts`.
 */
export class PlatformAuthGuard {
  constructor(private readonly serviceToken: string | undefined) {}

  authenticate(headers: Record<string, string | undefined>) {
    const token = headers['authorization']?.replace('Bearer', '').trim()

    if (!this.serviceToken || !token || token !== this.serviceToken) {
      return err({
        code: InternalErrorCode.UNAUTHORIZED,
        message: 'Invalid platform service token',
      })
    }

    return ok()
  }
}
