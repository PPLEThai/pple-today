import { Static, t } from 'elysia'

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
