import type { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { mapRepositoryError } from '@pple-today/api-common/utils'

import type { MiniAppUserRepository } from './app-user-repository'

/**
 * App User registration and counting. Kept free of Elysia/config imports so it
 * can be unit-tested without booting the app's config graph; the plugin wiring
 * lives in `services.ts`.
 */
export class AppUserService {
  constructor(
    private readonly miniAppUserRepository: MiniAppUserRepository,
    private readonly loggerService: ElysiaLoggerInstance
  ) {}

  /**
   * Register a user as an App User of a mini app on open. Idempotent at the
   * repository (composite key), so repeat opens are safe to call.
   *
   * Best-effort by design: a registry write failure is logged but never
   * surfaced, so a transient database hiccup can't stop a user from opening an
   * app they are allowed to open. The cost is that the user may miss that app's
   * notifications until their next open re-attempts the upsert.
   */
  async registerOpen(miniAppId: string, userId: string): Promise<void> {
    const result = await this.miniAppUserRepository.register(miniAppId, userId)

    if (result.isErr()) {
      this.loggerService.error({
        error: result.error,
        message: `Failed to register App User for mini app ${miniAppId}`,
      })
    }
  }

  /** Per-app App User count — the number the Console shows and the platform reads. */
  async getUserCount(miniAppId: string) {
    const result = await this.miniAppUserRepository.countByMiniApp(miniAppId)

    if (result.isErr()) {
      return mapRepositoryError(result.error)
    }

    return result
  }
}
