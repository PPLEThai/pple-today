import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminNotificationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private generateApiKey() {
    return `notification_${Math.random().toString(36).substring(2, 15)}`
  }

  async listApiKeys(query: { limit: number; page: number }) {
    const skip = (query.page - 1) * query.limit
    const take = query.limit

    return await fromRepositoryPromise(
      this.prismaService.notificationApiKey.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    )
  }

  async createApiKey(data: { name: string }) {
    const apiKey = this.generateApiKey()

    return await fromRepositoryPromise(
      this.prismaService.notificationApiKey.create({
        data: {
          name: data.name,
          apiKey,
        },
      })
    )
  }

  async updateApiKey(id: string, data: { name?: string }) {
    return await fromRepositoryPromise(
      this.prismaService.notificationApiKey.update({
        where: { id },
        data: {
          name: data.name,
        },
      })
    )
  }

  async deleteApiKey(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.notificationApiKey.delete({
        where: { id },
      })
    )
  }

  async rotateApiKey(id: string) {
    const newApiKey = this.generateApiKey()

    return await fromRepositoryPromise(
      this.prismaService.notificationApiKey.update({
        where: { id },
        data: { apiKey: newApiKey },
      })
    )
  }
}

export const AdminNotificationRepositoryPlugin = new Elysia({
  name: 'AdminNotificationRepository',
})
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    adminNotificationRepository: new AdminNotificationRepository(prismaService),
  }))
