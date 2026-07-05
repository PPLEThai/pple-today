import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CreateMiniAppBody,
  CreateMiniAppResponse,
  CreateZitadelAppBody,
  CreateZitadelAppResponse,
  DeleteMiniAppParams,
  DeleteMiniAppResponse,
  DeleteZitadelAppResponse,
  GetMiniAppsResponse,
  GetRoleOptionsResponse,
  GetZitadelAppsResponse,
  UpdateMiniAppBody,
  UpdateMiniAppParams,
  UpdateMiniAppResponse,
  UpdateZitadelAppInput,
  UpdateZitadelAppResponse,
  ZitadelAppParams,
} from './models'
import { AdminMiniAppServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminMiniAppController = new Elysia({
  prefix: '/mini-app',
  tags: ['Admin Mini App'],
})
  .use([AdminMiniAppServicePlugin, AdminAuthGuardPlugin])
  .get(
    '/',
    async ({ adminMiniAppService, status }) => {
      const result = await adminMiniAppService.getMiniApps()

      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetMiniAppsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get all mini apps',
        description: 'Fetch all mini app sorted by createdAt',
      },
    }
  )
  .post(
    '/',
    async ({ adminMiniAppService, body, status }) => {
      const createResult = await adminMiniAppService.createMiniApp(body)

      if (createResult.isErr()) {
        return mapErrorCodeToResponse(createResult.error, status)
      }

      return status(201, createResult.value)
    },
    {
      requiredLocalUser: true,
      body: CreateMiniAppBody,
      response: {
        201: CreateMiniAppResponse,
        ...createErrorSchema(
          InternalErrorCode.MINI_APP_SLUG_ALREADY_EXISTS,
          InternalErrorCode.MINI_APP_CLIENT_ID_REQUIRED,
          InternalErrorCode.ZITADEL_NOT_CONFIGURED,
          InternalErrorCode.ZITADEL_APP_CREATE_FAILED,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create a mini app',
        description:
          'Create a new mini app with the provided data. Optionally creates the OIDC app in Zitadel first (createZitadelApp) or falls back to the default client ID for mini apps that do not require auth.',
      },
    }
  )
  .get(
    '/roles',
    async ({ adminMiniAppService, headers, status }) => {
      const result = await adminMiniAppService.getRoleOptions(headers.authorization)

      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetRoleOptionsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get role options',
        description:
          'List selectable mini app role options (main AD roles plus extra roles from the AD role options API)',
      },
    }
  )
  .get(
    '/zitadel-app',
    async ({ adminMiniAppService, status }) => {
      const result = await adminMiniAppService.getZitadelApps()

      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetZitadelAppsResponse,
        ...createErrorSchema(
          InternalErrorCode.ZITADEL_NOT_CONFIGURED,
          InternalErrorCode.ZITADEL_APP_NOT_FOUND,
          InternalErrorCode.ZITADEL_REQUEST_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'List Zitadel OIDC apps',
        description: 'List all OIDC apps in the Zitadel mini-app project',
      },
    }
  )
  .patch(
    '/zitadel-app/:appId',
    async ({ adminMiniAppService, params, body, status }) => {
      const result = await adminMiniAppService.updateZitadelApp(params.appId, body)

      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: ZitadelAppParams,
      body: UpdateZitadelAppInput,
      response: {
        200: UpdateZitadelAppResponse,
        ...createErrorSchema(
          InternalErrorCode.ZITADEL_NOT_CONFIGURED,
          InternalErrorCode.ZITADEL_APP_NOT_FOUND,
          InternalErrorCode.ZITADEL_REQUEST_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update a Zitadel OIDC app',
        description: 'Update the name and/or OIDC configuration of a Zitadel app',
      },
    }
  )
  .delete(
    '/zitadel-app/:appId',
    async ({ adminMiniAppService, params, status }) => {
      const result = await adminMiniAppService.deleteZitadelApp(params.appId)

      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: ZitadelAppParams,
      response: {
        200: DeleteZitadelAppResponse,
        ...createErrorSchema(
          InternalErrorCode.ZITADEL_NOT_CONFIGURED,
          InternalErrorCode.ZITADEL_APP_NOT_FOUND,
          InternalErrorCode.ZITADEL_REQUEST_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete a Zitadel OIDC app',
        description: 'Delete an OIDC app from the Zitadel mini-app project',
      },
    }
  )
  .post(
    '/zitadel-app',
    async ({ adminMiniAppService, body, status }) => {
      const createResult = await adminMiniAppService.createZitadelApp(body)

      if (createResult.isErr()) {
        return mapErrorCodeToResponse(createResult.error, status)
      }

      return status(201, createResult.value)
    },
    {
      requiredLocalUser: true,
      body: CreateZitadelAppBody,
      response: {
        201: CreateZitadelAppResponse,
        ...createErrorSchema(
          InternalErrorCode.ZITADEL_NOT_CONFIGURED,
          InternalErrorCode.ZITADEL_APP_CREATE_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create a Zitadel OIDC app only',
        description:
          'Create an OIDC app in the Zitadel mini-app project without creating a mini app entry (for standalone webapps). The client secret, if any, is only shown once.',
      },
    }
  )
  .patch(
    '/:id',
    async ({ adminMiniAppService, body, params, status }) => {
      const updateResult = await adminMiniAppService.updateMiniApp(params.id, body)

      if (updateResult.isErr()) {
        return mapErrorCodeToResponse(updateResult.error, status)
      }

      return status(200, updateResult.value)
    },
    {
      requiredLocalUser: true,
      params: UpdateMiniAppParams,
      body: UpdateMiniAppBody,
      response: {
        200: UpdateMiniAppResponse,
        ...createErrorSchema(
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.MINI_APP_SLUG_ALREADY_EXISTS,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update a mini app',
        description: 'Update an existing mini app with the provided data',
      },
    }
  )
  .delete(
    '/:id',
    async ({ params, adminMiniAppService, status }) => {
      const deleteResult = await adminMiniAppService.deleteMiniApp(params.id)

      if (deleteResult.isErr()) {
        return mapErrorCodeToResponse(deleteResult.error, status)
      }

      return status(200, {
        message: 'Mini app deleted successfully',
      })
    },
    {
      requiredLocalUser: true,
      params: DeleteMiniAppParams,
      response: {
        200: DeleteMiniAppResponse,
        ...createErrorSchema(
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete a mini app',
        description: 'Delete an existing mini app by ID',
      },
    }
  )
