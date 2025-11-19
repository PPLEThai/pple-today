import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class MiniAppRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async listMiniApps() {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findMany({
        orderBy: {
          id: 'desc',
        },
      })
    )
  }

  async getMiniAppBySlug(slug: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findUniqueOrThrow({
        where: { slug },
      })
    )
  }
}

export const MiniAppRepositoryPlugin = new Elysia({ name: 'MiniAppRepository' })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    miniAppRepository: new MiniAppRepository(prismaService),
  }))
