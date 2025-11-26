import { NavigationInAppType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const Notification = t.Object({
  id: t.String(),
  content: t.Object({
    header: t.String(),
    message: t.String(),
    image: t.Optional(t.String()),
    actionButtonText: t.Optional(t.String()),
    link: t.Optional(
      t.Union([
        t.Object({
          type: t.Literal('MINI_APP'),
          destination: t.String(),
        }),
        t.Object({
          type: t.Literal('IN_APP_NAVIGATION'),
          destination: t.Object({
            inAppType: t.Enum(NavigationInAppType),
            inAppId: t.String(),
          }),
        }),
        t.Object({
          type: t.Literal('EXTERNAL_BROWSER'),
          destination: t.String(),
        }),
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
  createdAt: t.Date({
    description: 'The date and time when the notification API key was created',
  }),
  updatedAt: t.Date({
    description: 'The date and time when the notification API key was last updated',
  }),
})
export type NotificationApiKey = Static<typeof NotificationApiKey>
