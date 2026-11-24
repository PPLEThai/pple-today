import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { PrismaClientKnownRequestError } from '@pple-today/database/prisma/runtime/client'
import Elysia from 'elysia'

import { MiniAppUserRepository } from './app-user-repository'
import { miniAppListInclude } from './dto'
import { MiniAppInviteRepository } from './invite-repository'

import { PrismaServicePlugin } from '../../plugins/prisma'

const miniAppNotFound = () =>
  new PrismaClientKnownRequestError('Mini app not found', {
    code: 'P2025',
    clientVersion: 'mini-app',
  })

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
        include: miniAppListInclude,
      })
    )
  }

  /**
   * Load a non-retired mini app for the token-exchange / first-open path.
   * `entry` is the first segment of a Today Link: the slug, matched exactly as
   * it always has, or a Link Name the app holds. Tier and role eligibility are
   * applied in the service layer via `isMiniAppAccessible` — the access
   * counterpart of the listing rule — so this query does not invent a second
   * matrix (and in particular does not treat empty roles as "public" for
   * Draft/Beta apps).
   */
  async getMiniAppBySlug(entry: string) {
    return await fromRepositoryPromise(async () => {
      const bySlug = await this.prismaService.miniApp.findUnique({
        where: { slug: entry },
        include: { miniAppRoles: true },
      })
      // A retired app is soft-deleted everywhere: unreachable by slug or by a
      // leftover name, not just hidden from the list.
      if (bySlug) {
        if (bySlug.retiredAt) throw miniAppNotFound()
        return bySlug
      }

      const byName = await this.prismaService.miniAppLinkName.findUnique({
        where: { name: entry.toLowerCase() },
        select: { miniApp: { include: { miniAppRoles: true } } },
      })
      if (!byName || byName.miniApp.retiredAt) throw miniAppNotFound()
      return byName.miniApp
    })
  }

  /**
   * Load the non-retired mini apps registered under an OIDC client id. Client
   * ids are not unique — no-auth apps share the default client, and an app may
   * be registered twice at different URLs — so the caller narrows by page URL.
   */
  async listMiniAppsByClientId(clientId: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findMany({
        where: {
          clientId,
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
