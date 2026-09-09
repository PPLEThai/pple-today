import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CreateApiKeyNotificationBody,
  CreateApiKeyNotificationResponse,
  DeleteApiKeyNotificationParams,
  DeleteApiKeyNotificationResponse,
  ListApiKeyNotificationsQuery,
  ListApiKeyNotificationsResponse,
  RotateApiKeyNotificationParams,
  RotateApiKeyNotificationResponse,
  UpdateApiKeyNotificationBody,
  UpdateApiKeyNotificationParams,
  UpdateApiKeyNotificationResponse,
} from './models'
import { AdminNotificationServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminNotificationController = new Elysia({
  prefix: '/notifications',
  tags: ['Admin Notification'],
})
  .use([AdminNotificationServicePlugin, AdminAuthGuardPlugin])
  .group('/api-key', (app) =>
    app
      .get(
        '/',
        async ({ adminNotificationService, status, query }) => {
          const result = await adminNotificationService.listApiKeys(query)

          if (result.isErr()) {
            return mapErrorCodeToResponse(result.error, status)
          }

          return status(200, result.value)
        },
        {
          requiredLocalUser: true,
          detail: {
            summary: 'List API Key Notifications',
            description: 'Retrieve a list of API key notifications',
          },
          query: ListApiKeyNotificationsQuery,
          response: {
            200: ListApiKeyNotificationsResponse,
            ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
          },
        }
      )
      .post(
        '/',
        async ({ adminNotificationService, body, status }) => {
          const result = await adminNotificationService.createApiKey(body)

          if (result.isErr()) {
            return mapErrorCodeToResponse(result.error, status)
          }

          return status(201, result.value)
        },
        {
          requiredLocalUser: true,
          detail: {
            summary: 'Create API Key Notification',
            description:
              "Create a new API key notification. Optionally bound to a mini app, whose name and icon the notification then carries. Binding is attribution only: a key created here keeps full raw-targeting reach even when bound to a Builder App, which is how the central team notifies a Builder App's users with an audience the Builder itself may not name. Only the key the platform provisions for a Builder App is audience-scoped and metered.",
          },
          body: CreateApiKeyNotificationBody,
          response: {
            201: CreateApiKeyNotificationResponse,
            ...createErrorSchema(
              InternalErrorCode.INTERNAL_SERVER_ERROR,
              InternalErrorCode.MINI_APP_NOT_FOUND
            ),
          },
        }
      )
      .patch(
        '/:id',
        async ({ adminNotificationService, params, body, status }) => {
          const result = await adminNotificationService.updateApiKey(params.id, body)

          if (result.isErr()) {
            return mapErrorCodeToResponse(result.error, status)
          }

          return status(200, result.value)
        },
        {
          requiredLocalUser: true,
          detail: {
            summary: 'Update API Key Notification',
            description:
              'Update an existing API key notification. Keys provisioned for a Builder App are managed by the PPLE Platform Provisioner and are refused here.',
          },
          params: UpdateApiKeyNotificationParams,
          body: UpdateApiKeyNotificationBody,
          response: {
            200: UpdateApiKeyNotificationResponse,
            ...createErrorSchema(
              InternalErrorCode.INTERNAL_SERVER_ERROR,
              InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
              InternalErrorCode.NOTIFICATION_API_KEY_PLATFORM_MANAGED
            ),
          },
        }
      )
      .post(
        '/:id/generate',
        async ({ adminNotificationService, params, status }) => {
          const result = await adminNotificationService.rotateApiKey(params.id)

          if (result.isErr()) {
            return mapErrorCodeToResponse(result.error, status)
          }

          return status(200, result.value)
        },
        {
          requiredLocalUser: true,
          detail: {
            summary: 'Rotate API Key',
            description:
              'Rotate the API key for an existing API key notification. Keys provisioned for a Builder App are managed by the PPLE Platform Provisioner and are refused here.',
          },
          params: RotateApiKeyNotificationParams,
          response: {
            200: RotateApiKeyNotificationResponse,
            ...createErrorSchema(
              InternalErrorCode.INTERNAL_SERVER_ERROR,
              InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
              InternalErrorCode.NOTIFICATION_API_KEY_PLATFORM_MANAGED
            ),
          },
        }
      )
      .delete(
        '/:id',
        async ({ params, adminNotificationService, status }) => {
          const result = await adminNotificationService.deleteApiKey(params.id)

          if (result.isErr()) {
            return mapErrorCodeToResponse(result.error, status)
          }

          return status(204, 'No Content')
        },
        {
          requiredLocalUser: true,
          detail: {
            summary: 'Delete API Key Notification',
            description:
              'Delete an existing API key notification. Keys provisioned for a Builder App are managed by the PPLE Platform Provisioner and are refused here.',
          },
          params: DeleteApiKeyNotificationParams,
          response: {
            204: DeleteApiKeyNotificationResponse,
            ...createErrorSchema(
              InternalErrorCode.INTERNAL_SERVER_ERROR,
              InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
              InternalErrorCode.NOTIFICATION_API_KEY_PLATFORM_MANAGED
            ),
          },
        }
      )
  )
