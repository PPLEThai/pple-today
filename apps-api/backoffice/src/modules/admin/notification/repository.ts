import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import crypto from 'crypto'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminNotificationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private generateApiKey() {
    const randomNonce = crypto
      .getRandomValues(new Uint8Array(16))
      .reduce((acc, byte) => acc + byte.toString(36).padStart(2, '0'), '')

    return `pple_notification_${randomNonce}`
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

    return await fromRepositoryPromise(async () => {
      const newApiKeyEntry = await this.prismaService.notificationApiKey.create({
        data: {
          name: data.name,
          apiKey: crypto.hash('sha256', apiKey),
        },
      })

      return { ...newApiKeyEntry, apiKey }
    })
  }

  async updateApiKey(id: string, data: { name?: string; active?: boolean }) {
    return await fromRepositoryPromise(
      this.prismaService.notificationApiKey.update({
        where: { id },
        data: {
          name: data.name,
          active: data.active,
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
    return await fromRepositoryPromise(async () => {
      await this.prismaService.notificationApiKey.update({
        where: { id },
        data: { apiKey: crypto.hash('sha256', newApiKey) },
      })

      return {
        apiKey: newApiKey,
      }
    })
  }
}

export const AdminNotificationRepositoryPlugin = new Elysia({
  name: 'AdminNotificationRepository',
})
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    adminNotificationRepository: new AdminNotificationRepository(prismaService),
  }))
