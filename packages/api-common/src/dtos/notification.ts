import { NotificationInAppType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

const NotificationLinkBase = t.Object({
  bypassNotificationCenter: t.Optional(t.Boolean()),
})

/**
 * The app a notification came from, as the client renders it: an icon in place
 * of the platform bell and a name in place of "แจ้งเตือนทั่วไป".
 *
 * Absent means PPLE Today itself — every notification sent before app binding,
 * and every send from a legacy unbound key — so a client that ignores this
 * field keeps today's appearance.
 */
export const NotificationSenderApp = t.Object({
  name: t.String(),
  iconUrl: t.Optional(t.String()),
  /**
   * The app's mini-app slug, which the client turns into a route so a
   * notification carrying no link of its own can still offer a way into the app
   * that sent it.
   */
  slug: t.String(),
})
export type NotificationSenderApp = Static<typeof NotificationSenderApp>

export const Notification = t.Object({
  id: t.String(),
  app: t.Optional(NotificationSenderApp),
  content: t.Object({
    header: t.String(),
    message: t.String(),
    image: t.Optional(t.String()),
    actionButtonText: t.Optional(t.String()),
    link: t.Optional(
      t.Union([
        t.Composite([
          NotificationLinkBase,
          t.Object({
            type: t.Literal('MINI_APP'),
            destination: t.String(),
          }),
        ]),
        t.Composite([
          NotificationLinkBase,
          t.Object({
            type: t.Literal('IN_APP_NAVIGATION'),
            destination: t.Object({
              inAppType: t.Enum(NotificationInAppType),
              inAppId: t.String(),
            }),
          }),
        ]),
        t.Composite([
          NotificationLinkBase,
          t.Object({
            type: t.Literal('EXTERNAL_BROWSER'),
            destination: t.String(),
          }),
        ]),
      ])
    ),
  }),
  isRead: t.Boolean(),
  createdAt: t.Date(),
})
export type Notification = Static<typeof Notification>

export const NotificationApiKey = t.Object({
  id: t.String({ description: 'The ID of the notification API key' }),
  name: t.String({ description: 'The name of the notification API key' }),
  apiKey: t.String({ description: 'The notification API key' }),
  active: t.Boolean({ description: 'Whether the notification API key is active' }),
  miniAppId: t.Nullable(
    t.String({
      description:
        "The mini app this key is bound to. Null for a legacy unbound key with today's raw phone-number behaviour.",
    })
  ),
  createdAt: t.Date({
    description: 'The date and time when the notification API key was created',
  }),
  updatedAt: t.Date({
    description: 'The date and time when the notification API key was last updated',
  }),
})
export type NotificationApiKey = Static<typeof NotificationApiKey>
