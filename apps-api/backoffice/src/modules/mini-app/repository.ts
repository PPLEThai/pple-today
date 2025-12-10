import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class MiniAppRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async listMiniApps(roles: string[]) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findMany({
        orderBy: [
          {
            order: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
        where: {
          OR: [
            {
              miniAppRoles: {
                some: {
                  role: {
                    in: roles,
                  },
                },
              },
            },
            {
              miniAppRoles: {
                none: {},
              },
            },
          ],
        },
      })
    )
  }

  async getMiniAppBySlug(slug: string, roles: string[]) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findUniqueOrThrow({
        where: { slug, miniAppRoles: { some: { role: { in: roles } } } },
      })
    )
  }
}

export const MiniAppRepositoryPlugin = new Elysia({ name: 'MiniAppRepository' })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    miniAppRepository: new MiniAppRepository(prismaService),
  }))
