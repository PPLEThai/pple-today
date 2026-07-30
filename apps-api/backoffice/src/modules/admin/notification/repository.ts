import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'

import {
  generateNotificationApiKey,
  hashNotificationApiKey,
} from '../../../utils/notification-api-key'

/**
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`.
 */
export class AdminNotificationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async listApiKeys(query: { limit: number; page: number; miniAppId?: string }) {
    const skip = (query.page - 1) * query.limit
    const take = query.limit

    return await fromRepositoryPromise(
      this.prismaService.notificationApiKey.findMany({
        skip,
        take,
        where: query.miniAppId ? { miniAppId: query.miniAppId } : undefined,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          active: true,
          miniAppId: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    )
  }

  async createApiKey(data: { name: string; miniAppId?: string }) {
    const apiKey = generateNotificationApiKey()

    return await fromRepositoryPromise(async () => {
      const newApiKeyEntry = await this.prismaService.notificationApiKey.create({
        data: {
          name: data.name,
          apiKey: hashNotificationApiKey(apiKey),
          miniAppId: data.miniAppId,
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
    const newApiKey = generateNotificationApiKey()
    return await fromRepositoryPromise(async () => {
      await this.prismaService.notificationApiKey.update({
        where: { id },
        data: { apiKey: hashNotificationApiKey(newApiKey) },
      })

      return {
        apiKey: newApiKey,
      }
    })
  }
}
