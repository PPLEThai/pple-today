import { InternalErrorCode } from '@pple-today/api-common/dtos'
import type { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { err, ok } from 'neverthrow'

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

  /**
   * Register an App User who opened a mini app outside PPLE Today (e.g. from a
   * browser link), as reported by the platform edge. Writes the same
   * `MiniAppUser` row as `registerOpen`, but unlike it is not best-effort: the
   * platform needs to know whether the write landed, so failures are returned.
   *
   * - Unknown or retired mini app: `MINI_APP_NOT_FOUND`. Retired apps count as
   *   unknown because the in-app open path cannot reach them either.
   * - A `sub` with no PPLE Today account is a silent success with no write
   *   (`MiniAppUser.userId` is a foreign key to `User.id`), so the response never
   *   reveals whether an account exists.
   */
  async registerExternalOpen(miniAppId: string, userSub: string) {
    const miniApp = await this.miniAppUserRepository.activeMiniAppExists(miniAppId)
    if (miniApp.isErr()) {
      return mapRepositoryError(miniApp.error)
    }
    if (!miniApp.value) {
      return err({
        code: InternalErrorCode.MINI_APP_NOT_FOUND,
        message: `No mini app with id ${miniAppId}`,
      })
    }

    const user = await this.miniAppUserRepository.userExists(userSub)
    if (user.isErr()) {
      return mapRepositoryError(user.error)
    }
    if (!user.value) {
      return ok()
    }

    const registered = await this.miniAppUserRepository.register(miniAppId, userSub)
    if (registered.isErr()) {
      return mapRepositoryError(registered.error)
    }

    return ok()
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
