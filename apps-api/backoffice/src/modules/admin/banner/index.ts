import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CreateBannerBody,
  CreateBannerResponse,
  DeleteBannerParams,
  DeleteBannerResponse,
  GetBannerByIdParams,
  GetBannerByIdResponse,
  GetBannersResponse,
  ReorderBannerBody,
  ReorderBannerResponse,
  UpdateBannerBody,
  UpdateBannerParams,
  UpdateBannerResponse,
} from './models'
import { AdminBannerServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminBannerController = new Elysia({
  prefix: '/banners',
  tags: ['Admin Banner'],
})
  .use([AdminBannerServicePlugin, AdminAuthGuardPlugin])
  .get(
    '/',
    async ({ adminBannerService, status }) => {
      const result = await adminBannerService.getBanners()

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetBannersResponse,
        ...createErrorSchema(
          InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get all banners',
        description: 'Fetch all banner items sorted by order',
      },
    }
  )
  .get(
    '/:id',
    async ({ params, adminBannerService, status }) => {
      const result = await adminBannerService.getBannerById(params.id)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }
      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: GetBannerByIdParams,
      response: {
        200: GetBannerByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.BANNER_NOT_FOUND,
          InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get banner by id',
        description: 'Fetch a specific banner item by id',
      },
    }
  )
  .post(
    '/',
    async ({ body, adminBannerService, status }) => {
      const result = await adminBannerService.createBanner(body)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }
      return status(201, result.value)
    },
    {
      requiredLocalUser: true,
      body: CreateBannerBody,
      response: {
        201: CreateBannerResponse,
        ...createErrorSchema(
          InternalErrorCode.BANNER_INVALID_INPUT,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create banner',
        description: 'Create a new banner item',
      },
    }
  )
  .patch(
    '/:id',
    async ({ params, body, adminBannerService, status }) => {
      const result = await adminBannerService.updateBannerById(params.id, body)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }
      return status(200, { message: 'Banner updated.' })
    },
    {
      requiredLocalUser: true,
      params: UpdateBannerParams,
      body: UpdateBannerBody,
      response: {
        200: UpdateBannerResponse,
        ...createErrorSchema(
          InternalErrorCode.BANNER_NOT_FOUND,
          InternalErrorCode.BANNER_PUBLISHING_LIMIT_REACHED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update banner',
        description: 'Update a specific banner item by id',
      },
    }
  )
  .delete(
    '/:id',
    async ({ params, adminBannerService, status }) => {
      const result = await adminBannerService.deleteBannerById(params.id)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }
      return status(200, { message: 'Banner deleted.' })
    },
    {
      requiredLocalUser: true,
      params: DeleteBannerParams,
      response: {
        200: DeleteBannerResponse,
        ...createErrorSchema(
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.BANNER_NOT_FOUND,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete banner',
        description: 'Delete a specific banner item by id',
      },
    }
  )
  .post(
    '/reorder',
    async ({ body, adminBannerService, status }) => {
      const result = await adminBannerService.reorderBanner(body.ids)

      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, { message: 'Banners reordered.' })
    },
    {
      requiredLocalUser: true,
      body: ReorderBannerBody,
      response: {
        200: ReorderBannerResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Bulk reorder banners',
        description: 'Reorder banners by array of ids',
      },
    }
  )
