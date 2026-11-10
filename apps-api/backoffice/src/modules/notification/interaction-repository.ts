import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import {
  NotificationResponseChannel,
  NotificationTokenPlatform,
  Prisma,
} from '@pple-today/database/prisma'

import { deriveInteractionState } from './interaction'
import { isAppGone } from './interaction-read'
import { deviceHash } from './response-token'

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
   * Whether the user still has a registered device whose FCM token hashes to
   * `hash` (`deviceHash`): what binds a tray response token to a device that is
   * still signed in to that user. Tokens are hashed here rather than in SQL; a
   * user has a handful.
   */
  async hasDeviceWithHash(userId: string, hash: string) {
    return fromRepositoryPromise(async () => {
      const tokens = await this.prismaService.userNotificationToken.findMany({
        where: { userId },
        select: { token: true },
      })
      return tokens.some((t) => deviceHash(t.token) === hash)
    })
  }

  /**
   * Record the answer and mark the notification read, only while the
   * interaction is still open.
   *
   * One interactive transaction: lock the notification row (`FOR UPDATE`, which
   * is also what a concurrent close, an `updateMany` on that row, waits on),
   * re-read closed / expiry / app state under the lock, then insert the response
   * and mark it read. If the interaction is no longer open nothing is written and
   * the result says why.
   *
   * The unique `(notificationId, userId)` key is what makes "answer once" a
   * database fact: a concurrent second answer fails here with
   * `UNIQUE_CONSTRAINT_FAILED`, which the service reports as 409.
   */
  async createResponse(input: {
    notificationId: string
    userId: string
    actionId: string
    values: Prisma.InputJsonValue | undefined
    channel: NotificationResponseChannel
    now: Date
  }) {
    return fromRepositoryPromise(
      this.prismaService.$transaction(
        async (
          tx
        ): Promise<
          | {
              status: 'CREATED'
              response: {
                id: string
                actionId: string
                values: Prisma.JsonValue
                respondedAt: Date
              }
            }
          | { status: 'CLOSED' | 'EXPIRED' }
        > => {
          await tx.$queryRaw`SELECT "id" FROM "Notification" WHERE "id" = ${input.notificationId} FOR UPDATE`

          const row = await tx.notification.findUnique({
            where: { id: input.notificationId },
            select: {
              miniAppId: true,
              interactionClosedAt: true,
              interactionExpiresAt: true,
              miniApp: { select: { retiredAt: true } },
            },
          })
          if (!row) return { status: 'CLOSED' }
          const state = deriveInteractionState({
            hasResponse: false,
            closedAt: row.interactionClosedAt,
            expiresAt: row.interactionExpiresAt,
            appGone: row.miniAppId === null || isAppGone(row.miniApp),
            now: input.now,
          })
          if (state === 'CLOSED' || state === 'EXPIRED') return { status: state }

          const response = await tx.notificationResponse.create({
            data: {
              notificationId: input.notificationId,
              userId: input.userId,
              miniAppId: row.miniAppId,
              actionId: input.actionId,
              values: input.values,
              channel: input.channel,
              // The app's clock, not the database default: the sweep compares this
              // against the app's `now`, and the two clocks can differ.
              nextAttemptAt: new Date(),
            },
            select: { id: true, ...callerResponseSelect },
          })
          await tx.userNotification.updateMany({
            where: { userId: input.userId, notificationId: input.notificationId, isRead: false },
            data: { isRead: true, readAt: new Date() },
          })
          return { status: 'CREATED', response }
        }
      )
    )
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
