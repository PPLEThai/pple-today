import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { MiniAppUserRepository } from './app-user-repository'
import { MiniAppInviteRepository } from './invite-repository'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class MiniAppRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async listMiniApps() {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findMany({
        // Retired platform apps are soft-deleted: their Zitadel app is gone and
        // their notification key is deactivated, and they must vanish from every
        // user's list. Excluding them here keeps them out of the cached list too.
        where: {
          retiredAt: null,
        },
        orderBy: [
          {
            order: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
        include: {
          miniAppRoles: true,
        },
      })
    )
  }

  /**
   * Load a non-retired mini app by slug for the token-exchange / first-open
   * path. Tier and role eligibility are applied in the service layer via
   * `isMiniAppAccessible` — the access counterpart of the listing rule — so this
   * query does not invent a second matrix (and in particular does not treat
   * empty roles as "public" for Draft/Beta apps).
   */
  async getMiniAppBySlug(slug: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findUniqueOrThrow({
        where: {
          slug,
          // A retired app is soft-deleted everywhere: unreachable by slug, not
          // just hidden from the list (its Zitadel client is gone regardless).
          retiredAt: null,
        },
        include: {
          miniAppRoles: true,
        },
      })
    )
  }
}

export const MiniAppRepositoryPlugin = new Elysia({ name: 'MiniAppRepository' })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    miniAppRepository: new MiniAppRepository(prismaService),
  }))

export const MiniAppUserRepositoryPlugin = new Elysia({ name: 'MiniAppUserRepository' })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    miniAppUserRepository: new MiniAppUserRepository(prismaService),
  }))

export const MiniAppInviteRepositoryPlugin = new Elysia({ name: 'MiniAppInviteRepository' })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    miniAppInviteRepository: new MiniAppInviteRepository(prismaService),
  }))
