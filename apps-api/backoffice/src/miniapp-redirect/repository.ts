import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../plugins/prisma'

export class MiniAppRedirectRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getMiniAppBySlug(slug: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findUnique({
        where: { slug },
        select: {
          clientUrl: true,
        },
      })
    )
  }
}

export const MiniAppRedirectRepositoryPlugin = new Elysia({ name: 'MiniAppRedirectRepository' })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    miniAppRedirectRepository: new MiniAppRedirectRepository(prismaService),
  }))
