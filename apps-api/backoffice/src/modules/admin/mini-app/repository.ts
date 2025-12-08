import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { CreateMiniAppBody, UpdateMiniAppBody } from './models'

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
          miniAppRoles: true,
          order: true,
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      })
    )
  }

  async createMiniApp(data: CreateMiniAppBody) {
    return fromRepositoryPromise(
      this.prismaService.miniApp.create({
        data: {
          name: data.name,
          slug: data.slug,
          clientUrl: data.url,
          clientId: data.clientId,
          icon: data.iconUrl,
          miniAppRoles: data.roles
            ? {
                createMany: {
                  data: data.roles.map((role) => ({ role })),
                },
              }
            : undefined,
        },
        include: {
          miniAppRoles: true,
        },
      })
    )
  }

  async updateMiniApp(id: string, data: UpdateMiniAppBody) {
    return fromRepositoryPromise(
      this.prismaService.miniApp.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          clientUrl: data.url,
          clientId: data.clientId,
          icon: data.iconUrl,
          miniAppRoles: data.roles
            ? {
                deleteMany: {},
                createMany: {
                  data: data.roles.map((role) => ({ role })) || [],
                },
              }
            : undefined,
        },
        include: {
          miniAppRoles: true,
        },
      })
    )
  }

  async deleteMiniApp(id: string) {
    return fromRepositoryPromise(
      this.prismaService.miniApp.delete({
        where: { id },
      })
    )
  }
}

export const AdminMiniAppRepositoryPlugin = new Elysia({ name: 'AdminMiniAppRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService }) => ({
    adminMiniAppRepository: new AdminMiniAppRepository(prismaService),
  }))
