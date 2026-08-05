import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { requireUnboundKey } from './key-binding'
import {
  CreateAppNotificationBody,
  CreateAppNotificationResponse,
  CreateNewExternalNotificationBody,
  CreateNewExternalNotificationHeader,
  CreateNewExternalNotificationResponse,
  GetAppInstallStatusQuery,
  GetAppInstallStatusResponse,
  GetNotificationDetailsByIdParams,
  GetNotificationDetailsByIdResponse,
  GetUnreadNotificationCountResponse,
  ListHistoryNotificationQuery,
  ListHistoryNotificationResponse,
  ReadNotificationParams,
  ReadNotificationResponse,
  RegisterNotificationBody,
  RegisterNotificationResponse,
} from './models'
import { AppNotificationServicePlugin, NotificationServicePlugin } from './services'

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
        body.deviceToken,
        { platform: body.platform, supportsAppBranding: body.supportsAppBranding }
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
  .get(
    '/history',
    async ({ user, query, notificationService, status }) => {
      const listResult = await notificationService.listNotifications(
        user.id,
        query.cursor,
        query.limit
      )

      if (listResult.isErr()) {
        return mapErrorCodeToResponse(listResult.error, status)
      }

      return status(200, listResult.value)
    },
    {
      detail: {
        summary: 'List notification history for the authenticated user',
        description:
          'This endpoint allows the authenticated user to retrieve their notification history with pagination support using cursor and limit query parameters.',
      },
      requiredLocalUser: true,
      query: ListHistoryNotificationQuery,
      response: {
        200: ListHistoryNotificationResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .get(
    '/:id',
    async ({ params, user, notificationService, status }) => {
      const { id: notificationId } = params
      const getResult = await notificationService.getNotificationDetailsById(
        user.id,
        notificationId
      )

      if (getResult.isErr()) {
        return mapErrorCodeToResponse(getResult.error, status)
      }

      return status(200, getResult.value)
    },
    {
      detail: {
        summary: 'Get notification details by ID for the authenticated user',
        description:
          'This endpoint allows the authenticated user to retrieve the details of a specific notification by providing the notification ID in the URL parameter.',
      },
      requiredLocalUser: true,
      params: GetNotificationDetailsByIdParams,
      response: {
        200: GetNotificationDetailsByIdResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
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
  .get(
    '/unread-count',
    async ({ user, notificationService, status }) => {
      const countResult = await notificationService.getUnreadNotificationCount(user.id)

      if (countResult.isErr()) {
        return mapErrorCodeToResponse(countResult.error, status)
      }

      return status(200, {
        unreadCount: countResult.value,
      })
    },
    {
      detail: {
        summary: 'Get unread notification count for the authenticated user',
        description:
          'This endpoint allows the authenticated user to retrieve the count of their unread notifications.',
      },
      requiredLocalUser: true,
      response: {
        200: GetUnreadNotificationCountResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )

export const ExternalNotificationController = new Elysia({
  prefix: '/external/notifications',
  tags: ['External Notifications'],
})
  .use([NotificationServicePlugin, AppNotificationServicePlugin])
  // Audience-bound send. The key identifies the app; the body carries content
  // and nothing else. Recipients are resolved server-side as that app's App
  // Users within its current publication tier, so a Builder App can reach the
  // people who use it and has no way to name anybody else. A central-team app
  // may send here too — it simply has a second audience available to it on
  // /send — and is not metered.
  .post(
    '/',
    async ({ appNotificationService, notificationService, body, headers, status }) => {
      const token = headers['authorization'].split(' ')[1]
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

      const sendResult = await appNotificationService.send(
        tokenResult.value,
        body.content,
        body.linkPath
      )

      if (sendResult.isErr()) {
        return mapErrorCodeToResponse(sendResult.error, status)
      }

      return status(201, sendResult.value)
    },
    {
      detail: {
        summary: 'Send an audience-bound notification from a Builder App',
        description:
          "Send content to the app's own users. The notification key identifies the app, and the platform resolves the recipients: this app's App Users (people who have opened it), narrowed to its current publication tier — the owner for a Draft, the owner plus accepted testers for a Beta, every App User for a Live app. The request carries no phone numbers, user ids or audience of any kind. An optional linkPath deep-links into this app only (path starting with `/`); free-form cross-app destinations are not accepted. The notification carries the app's name and icon into the notification centre and the OS tray. A key bound to a Builder App counts each send against its daily quota; exceeding it returns 429 with the remaining budget and the reset time. Keys bound to a central-team app are not metered and their responses omit the quota fields. Legacy keys have no app binding and must use /send instead.",
      },
      headers: CreateNewExternalNotificationHeader,
      body: CreateAppNotificationBody,
      response: {
        201: CreateAppNotificationResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.NOTIFICATION_KEY_NOT_APP_BOUND,
          InternalErrorCode.NOTIFICATION_QUOTA_EXCEEDED,
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.NOTIFICATION_INVALID_LINK_PATH,
          InternalErrorCode.NOTIFICATION_INVALID_IN_APP_NAVIGATION,
          InternalErrorCode.NOTIFICATION_INVALID_BYPASS,
          InternalErrorCode.NOTIFICATION_SENT_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post(
    '/send',
    async ({ notificationService, body, headers, status }) => {
      const token = headers['authorization'].split(' ')[1] // Normally, you would validate this token
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

      // This is the raw-targeting path: the caller names its own audience, phone
      // numbers included. That stays a central-team capability, so keys bound to
      // a Builder App are refused here (see `requireUnboundKey`). Legacy unbound
      // keys and keys bound to a central-team app both pass straight through.
      const bindingResult = requireUnboundKey(tokenResult.value)

      if (bindingResult.isErr()) {
        return mapErrorCodeToResponse(bindingResult.error, status)
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
      detail: {
        summary: 'Send external notification to a user',
        description:
          "This endpoint allows sending notifications to external users based on their phone numbers. An API token is required for authentication. Raw recipient targeting is a central-team capability: keys bound to a Builder App are rejected here and must use POST /external/notifications. Legacy keys and keys bound to a central-team app are both accepted, and a bound key's notification carries that app's name and icon.",
      },
      headers: CreateNewExternalNotificationHeader,
      body: CreateNewExternalNotificationBody,
      response: {
        201: CreateNewExternalNotificationResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.NOTIFICATION_KEY_APP_BOUND,
          InternalErrorCode.NOTIFICATION_INVALID_IN_APP_NAVIGATION,
          InternalErrorCode.NOTIFICATION_INVALID_BYPASS,
          InternalErrorCode.NOTIFICATION_SENT_FAILED
        ),
      },
    }
  )
  // The read companion to /send: before a caller decides whether a person is
  // reachable by push at all, it can ask. Gated like the raw send path, and for
  // the same reason — the caller names a phone number it chose, which is a
  // central-team capability (see `requireUnboundKey`).
  .get(
    '/app-install',
    async ({ notificationService, query, headers, status }) => {
      const token = headers['authorization'].split(' ')[1]
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

      const bindingResult = requireUnboundKey(tokenResult.value)

      if (bindingResult.isErr()) {
        return mapErrorCodeToResponse(bindingResult.error, status)
      }

      const result = await notificationService.getAppInstallStatus(query.phoneNumber)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      detail: {
        summary: 'Whether PPLE Today reaches the phone behind a number',
        description:
          'Answers two things about a number, so a caller can tell someone who is missing notifications what to do about it. `isAppInstalled` says a PPLE Today account holds the number — which a PPLE ID alone does not imply, since registration happens on the pple-sso web site. `hasPushToken` says the native app is installed and reachable, and is the one that answers "will this person see a notification?": only the mobile app registers a token, it is false when notification permission was refused, and it self-corrects on uninstall because tokens FCM rejects are dropped on the next send. Unknown and malformed numbers answer both-false rather than erroring, and nothing else about the account is returned. Naming a phone number is a central-team capability, so keys bound to a Builder App are rejected here.',
      },
      headers: CreateNewExternalNotificationHeader,
      query: GetAppInstallStatusQuery,
      response: {
        200: GetAppInstallStatusResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.NOTIFICATION_KEY_APP_BOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
