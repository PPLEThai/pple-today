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
          value: t.String(),
        }),
        t.Object({
          type: t.Literal('IN_APP_NAVIGATION'),
          value: t.String(),
        }),
        t.Object({
          type: t.Literal('EXTERNAL_BROWSER'),
          value: t.String(),
        }),
      ])
    ),
  }),
  isRead: t.Boolean(),
  createdAt: t.Date(),
})
export type Notification = Static<typeof Notification>
