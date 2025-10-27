import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia, { t } from 'elysia'

import {
  CreateNewExternalNotificationBody,
  CreateNewExternalNotificationHeader,
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
      requiredLocalUser: true,
      response: {
        200: ReadNotificationResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .post(
    '/test',
    async ({ body, notificationService, status }) => {
      const notificationResult = await notificationService.testSendNotification(
        body.phoneNumber,
        body.title,
        body.message
      )

      if (notificationResult.isErr()) {
        return mapErrorCodeToResponse(notificationResult.error, status)
      }

      return status(200, {
        message: 'Test notification sent successfully',
      })
    },
    {
      body: t.Object({
        phoneNumber: t.String(),
        title: t.String(),
        message: t.String(),
      }),
    }
  )
  .group('/external', (app) =>
    app.post('/send', () => {}, {
      headers: CreateNewExternalNotificationHeader,
      body: CreateNewExternalNotificationBody,
    })
  )
