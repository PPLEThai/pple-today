import type { FilePath } from '@pple-today/api-common/dtos'
import type { FileService, PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { NotificationOrigin, Prisma } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'

/** The columns the history list and the detail both read. */
const sentNotificationSelect = {
  id: true,
  title: true,
  message: true,
  image: true,
  actionButtonText: true,
  linkType: true,
  linkDestination: true,
  linkInAppType: true,
  linkInAppId: true,
  linkBypassNotificationCenter: true,
  isBroadcast: true,
  roles: true,
  provinces: true,
  districts: true,
  interaction: true,
  interactionExpiresAt: true,
  interactionClosedAt: true,
  createdAt: true,
  sentByUser: { select: { id: true, name: true } },
  _count: { select: { sentNotifications: true, responses: true, phoneNumbers: true } },
} as const satisfies Prisma.NotificationSelect

/**
 * Who is looking, for `visibleTo`. `testSince` is the oldest test send the
 * viewer may still see: their own tests are listed for a short while after
 * sending, so they can check the result, and nobody else ever sees them.
 */
export interface SentNotificationViewer {
  userId: string
  testSince: Date
}

/**
 * A test send is addressed to its sender by user id, which the row does not
 * record, so it is the one portal send with no audience column set. Every other
 * kind refuses an empty selection, and a phone send stores its numbers whether
 * or not they matched anyone. (`toSentAudience` reads `TEST` the same way.)
 */
const isTestSend = {
  isBroadcast: false,
  roles: { isEmpty: true },
  provinces: { isEmpty: true },
  districts: { isEmpty: true },
  phoneNumbers: { none: {} },
} satisfies Prisma.NotificationWhereInput

/** Portal notifications this viewer may see: every real send, and their own recent tests. */
export const visibleTo = (viewer: SentNotificationViewer): Prisma.NotificationWhereInput => ({
  origin: NotificationOrigin.ADMIN_PORTAL,
  OR: [
    { NOT: isTestSend },
    { AND: [isTestSend, { sentByUserId: viewer.userId, createdAt: { gte: viewer.testSince } }] },
  ],
})

/**
 * Persistence for the admin portal's own notifications: the history list, one
 * notification's detail and answers, and the lookups the send form needs.
 *
 * Every read goes through `visibleTo`: scoped to `origin: ADMIN_PORTAL`, so an
 * app's notifications and their answers (which belong to that app) are never
 * listed here, and to tests the viewer sent recently.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`.
 */
export class AdminSentNotificationRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  /** The slug a `MINI_APP` link is built from, or null for an unknown or retired app. */
  async findMiniAppSlug(miniAppId: string) {
    return fromRepositoryPromise(
      this.prismaService.miniApp.findFirst({
        where: { id: miniAppId, retiredAt: null },
        select: { slug: true },
      })
    )
  }

  /**
   * The roles accounts actually hold, with how many hold each — what a ROLE
   * send can reach. Read from `UserRole` because that is what the send filters
   * on.
   */
  async listRoles() {
    return fromRepositoryPromise(async () => {
      const rows = await this.prismaService.userRole.groupBy({
        by: ['role'],
        _count: { userId: true },
        orderBy: { role: 'asc' },
      })
      return rows.map((row) => ({ role: row.role, userCount: row._count.userId }))
    })
  }

  /**
   * Move an uploaded image to the public folder and return its URL. The push
   * and the notification centre load the image by URL long after the send, so
   * it cannot be a signed URL that expires.
   */
  async publishImage(imageFilePath: FilePath) {
    const moved = await this.fileService.bulkMoveToPublicFolder([imageFilePath])
    if (moved.isErr()) return err(moved.error)
    return ok(this.fileService.getPublicFileUrl(moved.value[0]))
  }

  async countRecipients(notificationId: string) {
    return fromRepositoryPromise(
      this.prismaService.userNotification.count({ where: { notificationId } })
    )
  }

  async listSent(query: { page: number; limit: number }, viewer: SentNotificationViewer) {
    const where = visibleTo(viewer)
    return fromRepositoryPromise(async () => {
      const [rows, count] = await this.prismaService.$transaction([
        this.prismaService.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          select: sentNotificationSelect,
        }),
        this.prismaService.notification.count({ where }),
      ])
      return { rows, count }
    })
  }

  /** One portal notification with its read and per-action answer counts, or null. */
  async getSent(notificationId: string, viewer: SentNotificationViewer) {
    return fromRepositoryPromise(async () => {
      const row = await this.prismaService.notification.findFirst({
        where: { AND: [{ id: notificationId }, visibleTo(viewer)] },
        select: sentNotificationSelect,
      })
      if (!row) return null

      const [readCount, actionCounts] = await Promise.all([
        this.prismaService.userNotification.count({ where: { notificationId, isRead: true } }),
        this.prismaService.notificationResponse.groupBy({
          by: ['actionId'],
          where: { notificationId },
          _count: { _all: true },
        }),
      ])

      return {
        row,
        readCount,
        actionCounts: new Map(actionCounts.map((c) => [c.actionId, c._count._all])),
      }
    })
  }

  /** Whether this viewer may see this portal notification. */
  async isVisible(notificationId: string, viewer: SentNotificationViewer) {
    return fromRepositoryPromise(async () => {
      const count = await this.prismaService.notification.count({
        where: { AND: [{ id: notificationId }, visibleTo(viewer)] },
      })
      return count > 0
    })
  }

  /** Answers to one portal notification, oldest first, or null when it is not one. */
  async listResponses(
    notificationId: string,
    query: { page: number; limit: number },
    viewer: SentNotificationViewer
  ) {
    return fromRepositoryPromise(async () => {
      const exists = await this.prismaService.notification.count({
        where: { AND: [{ id: notificationId }, visibleTo(viewer)] },
      })
      if (exists === 0) return null

      const where = { notificationId }
      const [rows, count] = await this.prismaService.$transaction([
        this.prismaService.notificationResponse.findMany({
          where,
          // `id` breaks ties so pages are stable while answers keep arriving.
          orderBy: [{ respondedAt: 'asc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          select: {
            id: true,
            actionId: true,
            values: true,
            channel: true,
            respondedAt: true,
            user: { select: { id: true, name: true, phoneNumber: true } },
          },
        }),
        this.prismaService.notificationResponse.count({ where }),
      ])
      return { rows, count }
    })
  }
}

export type SentNotificationRow = Prisma.NotificationGetPayload<{
  select: typeof sentNotificationSelect
}>
