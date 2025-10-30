import { NotificationApiKey, PaginationQuery } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const ListApiKeyNotificationsQuery = PaginationQuery
export type ListApiKeyNotificationsQuery = Static<typeof ListApiKeyNotificationsQuery>

export const ListApiKeyNotificationsResponse = t.Array(
  t.Pick(NotificationApiKey, ['id', 'name', 'active', 'createdAt', 'updatedAt'])
)
export type ListApiKeyNotificationsResponse = Static<typeof ListApiKeyNotificationsResponse>

export const CreateApiKeyNotificationBody = t.Pick(NotificationApiKey, ['name'])
export type CreateApiKeyNotificationBody = Static<typeof CreateApiKeyNotificationBody>

export const CreateApiKeyNotificationResponse = NotificationApiKey
export type CreateApiKeyNotificationResponse = Static<typeof CreateApiKeyNotificationResponse>

export const UpdateApiKeyNotificationParams = t.Object({
  id: t.String({ description: 'The ID of the API key notification' }),
})
export type UpdateApiKeyNotificationParams = Static<typeof UpdateApiKeyNotificationParams>

export const UpdateApiKeyNotificationBody = t.Partial(
  t.Pick(NotificationApiKey, ['name', 'active'])
)
export type UpdateApiKeyNotificationBody = Static<typeof UpdateApiKeyNotificationBody>

export const UpdateApiKeyNotificationResponse = t.Pick(NotificationApiKey, [
  'id',
  'name',
  'active',
  'createdAt',
  'updatedAt',
])
export type UpdateApiKeyNotificationResponse = Static<typeof UpdateApiKeyNotificationResponse>

export const RotateApiKeyNotificationParams = t.Object({
  id: t.String({ description: 'The ID of the API key notification' }),
})
export type RotateApiKeyNotificationParams = Static<typeof RotateApiKeyNotificationParams>

export const RotateApiKeyNotificationResponse = t.Pick(NotificationApiKey, ['apiKey'])
export type RotateApiKeyNotificationResponse = Static<typeof RotateApiKeyNotificationResponse>

export const DeleteApiKeyNotificationParams = t.Object({
  id: t.String({ description: 'The ID of the API key notification' }),
})
export type DeleteApiKeyNotificationParams = Static<typeof DeleteApiKeyNotificationParams>

export const DeleteApiKeyNotificationResponse = t.Void()
export type DeleteApiKeyNotificationResponse = Static<typeof DeleteApiKeyNotificationResponse>
