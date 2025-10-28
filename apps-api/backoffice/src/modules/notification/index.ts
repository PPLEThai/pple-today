import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CreateNewExternalNotificationBody,
  CreateNewExternalNotificationHeader,
  CreateNewExternalNotificationResponse,
  ReadNotificationParams,
  ReadNotificationResponse,
  RegisterNotificationBody,
  RegisterNotificationResponse,
} from './models'
import { NotificationServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const NotificationController = new Elysia({
  prefix: '/notifications',
  tags: ['Notifications'],
})
  .use([AuthGuardPlugin, NotificationServicePlugin])
  .post(
    '/register',
    async ({ body, user, notificationService, status }) => {
      const registerResult = await notificationService.registerDeviceToken(
        user.id,
        body.deviceToken
      )

      if (registerResult.isErr()) {
        return mapErrorCodeToResponse(registerResult.error, status)
      }

      return status(201, {
        message: 'Device token registered successfully',
      })
    },
    {
      detail: {
        summary: 'Register device token for push notifications',
        description:
          'This endpoint allows the authenticated user to register their device token for receiving push notifications.',
      },
      requiredLocalUser: true,
      body: RegisterNotificationBody,
      response: {
        201: RegisterNotificationResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .get('/history', () => {})
  .put(
    '/read/:id',
    async ({ params, notificationService, user, status }) => {
      const { id: notificationId } = params
      const readResult = await notificationService.markAsRead(user.id, notificationId)

      if (readResult.isErr()) {
        return mapErrorCodeToResponse(readResult.error, status)
      }

      return status(200, {
        message: 'Notification marked as read successfully',
      })
    },
    {
      detail: {
        summary: 'Mark a specific notification as read for the authenticated user',
        description:
          'This endpoint allows the authenticated user to mark a specific notification as read by providing the notification ID in the URL parameter.',
      },
      requiredLocalUser: true,
      params: ReadNotificationParams,
      response: {
        200: ReadNotificationResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .put(
    '/read-all',
    async ({ user, notificationService, status }) => {
      const markAllResult = await notificationService.markAllAsRead(user.id)

      if (markAllResult.isErr()) {
        return mapErrorCodeToResponse(markAllResult.error, status)
      }

      return status(200, {
        message: 'All notifications marked as read successfully',
      })
    },
    {
      detail: {
        summary: 'Mark all notifications as read for the authenticated user',
        description:
          'This endpoint allows the authenticated user to mark all their notifications as read in one action.',
      },
      requiredLocalUser: true,
      response: {
        200: ReadNotificationResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )

export const ExternalNotificationController = new Elysia({
  prefix: '/external/notifications',
  tags: ['External Notifications'],
})
  .use([NotificationServicePlugin])
  .post(
    '/send',
    async ({ notificationService, body, headers, status }) => {
      const token = headers['Authorization'].split(' ')[1] // Normally, you would validate this token
      const tokenResult = await notificationService.checkApiToken(token)

      if (tokenResult.isErr()) return mapErrorCodeToResponse(tokenResult.error, status)

      if (!tokenResult.value) {
        return mapErrorCodeToResponse(
          {
            code: InternalErrorCode.UNAUTHORIZED,
            message: 'Invalid API token',
          },
          status
        )
      }

      const sendResult = await notificationService.sendExternalNotification(body, tokenResult.value)

      if (sendResult.isErr()) {
        return mapErrorCodeToResponse(sendResult.error, status)
      }

      return status(201, {
        success: true,
        phoneNumber: sendResult.value,
      })
    },
    {
      headers: CreateNewExternalNotificationHeader,
      body: CreateNewExternalNotificationBody,
      response: {
        201: CreateNewExternalNotificationResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.NOTIFICATION_SENT_FAILED
        ),
      },
    }
  )
