import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminMiniAppRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getMiniApps() {
    return fromRepositoryPromise(
      this.prismaService.miniApp.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    )
  }
}

export const AdminMiniAppRepositoryPlugin = new Elysia({ name: 'AdminMiniAppRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService }) => ({
    adminMiniAppRepository: new AdminMiniAppRepository(prismaService),
  }))
