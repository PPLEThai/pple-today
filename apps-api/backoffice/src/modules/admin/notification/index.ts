import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  AdminCloseNotificationInteractionResponse,
  AdminCountNotificationAudienceBody,
  AdminCountNotificationAudienceResponse,
  AdminListNotificationResponsesQuery,
  AdminListNotificationResponsesResponse,
  AdminListSentNotificationsQuery,
  AdminListSentNotificationsResponse,
  AdminNotificationRolesResponse,
  AdminSendNotificationBody,
  AdminSendNotificationResponse,
  AdminSendTestNotificationBody,
  AdminSendTestNotificationResponse,
  AdminSentNotificationDetail,
  AdminSentNotificationParams,
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
import { AdminNotificationSendServicePlugin, AdminNotificationServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'
import { InteractionServicePlugin } from '../../notification/services'

export const AdminNotificationController = new Elysia({
  prefix: '/notifications',
  tags: ['Admin Notification'],
})
  .use([
    AdminNotificationServicePlugin,
    AdminNotificationSendServicePlugin,
    InteractionServicePlugin,
    AdminAuthGuardPlugin,
  ])
  // Composing and sending from the admin portal. Always sent as PPLE Today: no
  // sender app, no app key. Answers to an interaction are kept here and read
  // through /sent/:id/responses instead of being POSTed to an app.
  .post(
    '/send',
    async ({ adminNotificationSendService, body, user, status }) => {
      const result = await adminNotificationSendService.send(body, { userId: user.id })
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)
      return status(201, result.value)
    },
    {
      requiredLocalUser: true,
      detail: {
        summary: 'Send a notification from the admin portal',
        description:
          'Send a notification as PPLE Today to everyone, to accounts holding any of some roles, to accounts in some provinces or districts, or to phone numbers. Optional image, link (in-app, mini app, external), bypass of the notification centre, SMS fallback (phone numbers only) and interaction (form, tray buttons, iOS Live Activity). Answers to the interaction are stored and listed in the admin portal; nothing is called back. Unmetered.',
      },
      body: AdminSendNotificationBody,
      response: {
        201: AdminSendNotificationResponse,
        ...createErrorSchema(
          InternalErrorCode.BAD_REQUEST,
          InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS,
          InternalErrorCode.NOTIFICATION_INVALID_IN_APP_NAVIGATION,
          InternalErrorCode.NOTIFICATION_INVALID_BYPASS,
          InternalErrorCode.NOTIFICATION_INVALID_LINK_PATH,
          InternalErrorCode.NOTIFICATION_INVALID_INTERACTION,
          InternalErrorCode.NOTIFICATION_INTERACTION_BYPASS_NOT_ALLOWED,
          // Never returned for a portal send (answers stay here, so there is no
          // callback to lack), but the shared send-time check can name it.
          InternalErrorCode.NOTIFICATION_INTERACTION_NO_CALLBACK,
          InternalErrorCode.INTERACTIVE_NOTIFICATIONS_DISABLED,
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.NOTIFICATION_SENT_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post(
    '/send-test',
    async ({ adminNotificationSendService, body, user, status }) => {
      const result = await adminNotificationSendService.sendTest(body, { userId: user.id })
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)
      return status(201, result.value)
    },
    {
      requiredLocalUser: true,
      detail: {
        summary: 'Send a test notification to yourself',
        description:
          "The same notification as /send, delivered only to the calling admin's own PPLE Today account (the account with their PPLE ID). It is listed in the history as a test, and its interaction can be answered. Never sent by SMS.",
      },
      body: AdminSendTestNotificationBody,
      response: {
        201: AdminSendTestNotificationResponse,
        ...createErrorSchema(
          InternalErrorCode.NOTIFICATION_INVALID_IN_APP_NAVIGATION,
          InternalErrorCode.NOTIFICATION_INVALID_BYPASS,
          InternalErrorCode.NOTIFICATION_INVALID_LINK_PATH,
          InternalErrorCode.NOTIFICATION_INVALID_INTERACTION,
          InternalErrorCode.NOTIFICATION_INTERACTION_BYPASS_NOT_ALLOWED,
          InternalErrorCode.NOTIFICATION_INTERACTION_NO_CALLBACK,
          InternalErrorCode.INTERACTIVE_NOTIFICATIONS_DISABLED,
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.NOTIFICATION_SENT_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post(
    '/audience-count',
    async ({ adminNotificationSendService, body, status }) => {
      const result = await adminNotificationSendService.countAudience(body.audience)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)
      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      detail: {
        summary: 'Count a notification audience',
        description:
          'How many accounts an audience matches and how many of them have a push token, using the same filter as the send. Phone numbers that are not a Thai mobile are listed rather than refused.',
      },
      body: AdminCountNotificationAudienceBody,
      response: {
        200: AdminCountNotificationAudienceResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .get(
    '/roles',
    async ({ adminNotificationSendService, status }) => {
      const result = await adminNotificationSendService.listRoles()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)
      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      detail: {
        summary: 'List roles a notification can target',
        description: 'Every role an account holds, with how many accounts hold it.',
      },
      response: {
        200: AdminNotificationRolesResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .get(
    '/sent',
    async ({ adminNotificationSendService, query, user, status }) => {
      const result = await adminNotificationSendService.listSent(query, { userId: user.id })
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)
      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      detail: {
        summary: 'List notifications sent from the admin portal',
        description:
          "Newest first. Notifications sent through an API key are not listed, and neither are test sends, except the caller's own for an hour after sending.",
      },
      query: AdminListSentNotificationsQuery,
      response: {
        200: AdminListSentNotificationsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .get(
    '/sent/:id',
    async ({ adminNotificationSendService, params, user, status }) => {
      const result = await adminNotificationSendService.getSent(params.id, { userId: user.id })
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)
      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      detail: {
        summary: 'Get a notification sent from the admin portal',
        description:
          'Its content, audience, recipient and read counts, and, when it has an interaction, the form and the number of answers per action.',
      },
      params: AdminSentNotificationParams,
      response: {
        200: AdminSentNotificationDetail,
        ...createErrorSchema(
          InternalErrorCode.NOTIFICATION_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .get(
    '/sent/:id/responses',
    async ({ adminNotificationSendService, params, query, user, status }) => {
      const result = await adminNotificationSendService.listResponses(params.id, query, {
        userId: user.id,
      })
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)
      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      detail: {
        summary: 'List answers to a notification sent from the admin portal',
        description:
          'Oldest first, with who answered. Answers are kept here for as long as the notification exists; nothing purges them.',
      },
      params: AdminSentNotificationParams,
      query: AdminListNotificationResponsesQuery,
      response: {
        200: AdminListNotificationResponsesResponse,
        ...createErrorSchema(
          InternalErrorCode.NOTIFICATION_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post(
    '/sent/:id/close',
    async ({ adminNotificationSendService, interactionService, params, user, status }) => {
      // Someone else's test is not this admin's to see, so not theirs to close either.
      const visible = await adminNotificationSendService.checkVisible(params.id, {
        userId: user.id,
      })
      if (visible.isErr()) return mapErrorCodeToResponse(visible.error, status)

      const result = await interactionService.closePortalInteraction(params.id)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)
      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      detail: {
        summary: 'Stop accepting answers to a notification sent from the admin portal',
        description:
          'Recipients who have not answered then see it as closed, and Live Activities are ended. Idempotent: a repeat close returns the first close time.',
      },
      params: AdminSentNotificationParams,
      response: {
        200: AdminCloseNotificationInteractionResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERACTIVE_NOTIFICATIONS_DISABLED,
          InternalErrorCode.NOTIFICATION_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
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
