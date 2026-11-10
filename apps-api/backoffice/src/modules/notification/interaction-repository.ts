import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import {
  NotificationResponseChannel,
  NotificationTokenPlatform,
  Prisma,
} from '@pple-today/database/prisma'

/** The response fields a client may see, always filtered to the caller by the query. */
const callerResponseSelect = { actionId: true, values: true, respondedAt: true } as const

/**
 * Persistence for answering and closing interactive notifications.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`.
 */
export class InteractionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * The notification as one recipient sees it, with their own answer, or null
   * when it does not exist or they are not a recipient (no `UserNotification`
   * row). "Does not exist" and "not yours" are one answer on purpose.
   */
  async getForResponse(userId: string, notificationId: string) {
    return fromRepositoryPromise(async () => {
      const row = await this.prismaService.userNotification.findUnique({
        where: { userId_notificationId: { userId, notificationId } },
        select: {
          notification: {
            select: {
              interaction: true,
              interactionExpiresAt: true,
              interactionClosedAt: true,
              miniAppId: true,
              miniApp: { select: { retiredAt: true } },
              responses: { where: { userId }, select: callerResponseSelect },
            },
          },
        },
      })
      return row?.notification ?? null
    })
  }

  /** The caller's recorded answer, for the lost-the-race path. */
  async getResponse(userId: string, notificationId: string) {
    return fromRepositoryPromise(
      this.prismaService.notificationResponse.findUnique({
        where: { notificationId_userId: { notificationId, userId } },
        select: callerResponseSelect,
      })
    )
  }

  /**
   * Record the answer and mark the notification read, in one transaction.
   *
   * The unique `(notificationId, userId)` key is what makes "answer once" a
   * database fact: a concurrent second answer fails here with
   * `UNIQUE_CONSTRAINT_FAILED`, which the service reports as 409.
   */
  async createResponse(input: {
    notificationId: string
    userId: string
    miniAppId: string
    actionId: string
    values: Prisma.InputJsonValue | undefined
    channel: NotificationResponseChannel
  }) {
    return fromRepositoryPromise(async () => {
      const [response] = await this.prismaService.$transaction([
        this.prismaService.notificationResponse.create({
          data: {
            notificationId: input.notificationId,
            userId: input.userId,
            miniAppId: input.miniAppId,
            actionId: input.actionId,
            values: input.values,
            channel: input.channel,
          },
          select: { id: true, ...callerResponseSelect },
        }),
        this.prismaService.userNotification.updateMany({
          where: { userId: input.userId, notificationId: input.notificationId, isRead: false },
          data: { isRead: true, readAt: new Date() },
        }),
      ])
      return response
    })
  }

  /**
   * The user's Android devices that can show tray actions — who gets the dismiss
   * push. The answering device is not excluded: the server cannot tell which
   * device answered (a session submit does not say, and neither does a token),
   * and the one that did has already removed its card, so a dismiss there is a
   * no-op.
   */
  async getTrayDismissTokens(userId: string) {
    return fromRepositoryPromise(async () => {
      const tokens = await this.prismaService.userNotificationToken.findMany({
        where: {
          userId,
          platform: NotificationTokenPlatform.ANDROID,
          supportsTrayInteraction: true,
        },
        select: { token: true },
      })
      return tokens.map((t) => t.token)
    })
  }

  /**
   * The app's own interactive notification, or null. `miniAppId` is part of the
   * match so another app's id answers exactly like a missing one.
   */
  async getOwnInteraction(notificationId: string, miniAppId: string) {
    return fromRepositoryPromise(
      this.prismaService.notification.findFirst({
        where: { id: notificationId, miniAppId, interaction: { not: Prisma.DbNull } },
        select: { interactionClosedAt: true },
      })
    )
  }

  /**
   * Stamp `interactionClosedAt` once. Never overwrites, so a second close keeps
   * the first time. Returns the stored value.
   */
  async closeInteraction(notificationId: string, closedAt: Date) {
    return fromRepositoryPromise(async () => {
      await this.prismaService.notification.updateMany({
        where: { id: notificationId, interactionClosedAt: null },
        data: { interactionClosedAt: closedAt },
      })
      const row = await this.prismaService.notification.findUniqueOrThrow({
        where: { id: notificationId },
        select: { interactionClosedAt: true },
      })
      return row.interactionClosedAt ?? closedAt
    })
  }
}
