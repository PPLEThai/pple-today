import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'

/**
 * Persistence for `MiniAppUser` — the registry of who has opened each mini app.
 * Dual-purpose per the platform design: the audience for audience-bound
 * notifications and the Console's per-app user count.
 *
 * The class is kept free of Elysia/config imports so it can be unit-tested
 * without booting the app's config graph; the plugin wiring lives in
 * `repository.ts`.
 */
export class MiniAppUserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Register a user as an App User of a mini app on first open. Idempotent: the
   * composite primary key `(miniAppId, userId)` makes repeat opens a no-op
   * `update`, so `firstOpenedAt` keeps its original value and no duplicate row
   * is created.
   */
  async register(miniAppId: string, userId: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniAppUser.upsert({
        where: { miniAppId_userId: { miniAppId, userId } },
        create: { miniAppId, userId },
        update: {},
      })
    )
  }

  /** Count the App Users of a single mini app. */
  async countByMiniApp(miniAppId: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniAppUser.count({ where: { miniAppId } })
    )
  }
}
