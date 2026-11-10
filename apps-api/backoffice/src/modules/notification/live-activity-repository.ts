import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'

import { deviceHash } from './response-token'

/**
 * Persistence for iOS Live Activities (`NotificationLiveActivity`). Kept free
 * of Elysia/config imports so it can be unit-tested without the config graph.
 */
export class LiveActivityRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * The FCM token of the user's registered device that hashes to `hash`, or
   * null: what binds a response token to a device that is still signed in.
   */
  async getDeviceTokenByHash(userId: string, hash: string) {
    return fromRepositoryPromise(async () => {
      const tokens = await this.prismaService.userNotificationToken.findMany({
        where: { userId },
        select: { token: true },
      })
      return tokens.find((t) => deviceHash(t.token) === hash)?.token ?? null
    })
  }

  /**
   * Record the activity's update token for (notification, device). A rotation
   * overwrites it. `ended` stamps `endedAt` (nothing to end remotely), and an
   * already-ended row keeps its original time.
   */
  async upsert(input: {
    notificationId: string
    userId: string
    deviceToken: string
    pushToken: string
    ended: boolean
    now: Date
  }) {
    const endedAt = input.ended ? input.now : null
    return fromRepositoryPromise(
      this.prismaService.notificationLiveActivity.upsert({
        where: {
          notificationId_deviceToken: {
            notificationId: input.notificationId,
            deviceToken: input.deviceToken,
          },
        },
        create: {
          notificationId: input.notificationId,
          userId: input.userId,
          deviceToken: input.deviceToken,
          pushToken: input.pushToken,
          endedAt,
        },
        update: {
          userId: input.userId,
          pushToken: input.pushToken,
          ...(input.ended ? { endedAt: input.now } : {}),
        },
        select: { id: true, endedAt: true },
      })
    )
  }

  /** Un-ended activities of a notification, optionally only one user's. */
  async listUnended(input: { notificationId: string; userId?: string }) {
    return fromRepositoryPromise(
      this.prismaService.notificationLiveActivity.findMany({
        where: {
          notificationId: input.notificationId,
          endedAt: null,
          ...(input.userId ? { userId: input.userId } : {}),
        },
        select: { id: true, deviceToken: true, pushToken: true },
      })
    )
  }

  /** Un-ended activities whose notification's expiry has passed, oldest first, bounded. */
  async listExpiredUnended(now: Date, limit: number) {
    return fromRepositoryPromise(
      this.prismaService.notificationLiveActivity.findMany({
        where: { endedAt: null, notification: { interactionExpiresAt: { lte: now } } },
        orderBy: { createdAt: 'asc' },
        take: limit,
        select: {
          id: true,
          deviceToken: true,
          pushToken: true,
          notification: { select: { interactionClosedAt: true } },
        },
      })
    )
  }

  async markEnded(ids: string[], now: Date) {
    return fromRepositoryPromise(
      this.prismaService.notificationLiveActivity.updateMany({
        where: { id: { in: ids }, endedAt: null },
        data: { endedAt: now },
      })
    )
  }
}
