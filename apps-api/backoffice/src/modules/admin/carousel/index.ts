import Elysia from 'elysia'

import {
  CreateCarouselBody,
  CreateCarouselResponse,
  DeleteCarouselParams,
  DeleteCarouselResponse,
  GetCarouselByIdParams,
  GetCarouselByIdResponse,
  GetCarouselsResponse,
  ReorderCarouselBody,
  ReorderCarouselResponse,
  UpdateCarouselBody,
  UpdateCarouselParams,
  UpdateCarouselResponse,
} from './models'
import { CarouselServicePlugin } from './services'

import { InternalErrorCode } from '../../../dtos/error'
import { AuthGuardPlugin } from '../../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../../utils/error'

export const CarouselController = new Elysia({
  prefix: '/admin/carousels',
  tags: ['Admin Carousel'],
})
  .use([CarouselServicePlugin, AuthGuardPlugin])
  .get(
    '/',
    async ({ carouselService, status }) => {
      const result = await carouselService.getCarousels()

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      requiredUser: true,
      response: {
        200: GetCarouselsResponse,
        ...createErrorSchema(
          InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get all carousels',
        description: 'Fetch all carousel items sorted by order',
      },
    }
  )
  .get(
    '/:id',
    async ({ params, carouselService, status }) => {
      const result = await carouselService.getCarouselById(params.id)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.CAROUSEL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }
      return status(200, result.value)
    },
    {
      requiredUser: true,
      params: GetCarouselByIdParams,
      response: {
        200: GetCarouselByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.CAROUSEL_NOT_FOUND,
          InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get carousel by id',
        description: 'Fetch a specific carousel item by id',
      },
    }
  )
  .post(
    '/',
    async ({ body, carouselService, status }) => {
      const result = await carouselService.createCarousel(body)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.CAROUSEL_INVALID_INPUT:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.FILE_MOVE_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }
      return status(201, result.value)
    },
    {
      requiredUser: true,
      body: CreateCarouselBody,
      response: {
        201: CreateCarouselResponse,
        ...createErrorSchema(
          InternalErrorCode.CAROUSEL_INVALID_INPUT,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create carousel',
        description: 'Create a new carousel item',
      },
    }
  )
  .put(
    '/:id',
    async ({ params, body, carouselService, status }) => {
      const result = await carouselService.updateCarouselById(params.id, body)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.CAROUSEL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.FILE_DELETE_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.FILE_MOVE_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }
      return status(200, { message: 'Carousel updated.' })
    },
    {
      requiredUser: true,
      params: UpdateCarouselParams,
      body: UpdateCarouselBody,
      response: {
        200: UpdateCarouselResponse,
        ...createErrorSchema(
          InternalErrorCode.CAROUSEL_NOT_FOUND,
          InternalErrorCode.FILE_DELETE_ERROR,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update carousel',
        description: 'Update a specific carousel item by id',
      },
    }
  )
  .delete(
    '/:id',
    async ({ params, carouselService, status }) => {
      const result = await carouselService.deleteCarouselById(params.id)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.CAROUSEL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.FILE_DELETE_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }
      return status(200, { message: 'Carousel deleted.' })
    },
    {
      requiredUser: true,
      params: DeleteCarouselParams,
      response: {
        200: DeleteCarouselResponse,
        ...createErrorSchema(
          InternalErrorCode.FILE_DELETE_ERROR,
          InternalErrorCode.CAROUSEL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete carousel',
        description: 'Delete a specific carousel item by id',
      },
    }
  )
  .post(
    '/reorder',
    async ({ body, carouselService, status }) => {
      const result = await carouselService.reorderCarousel(body.ids)

      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, { message: 'Carousels reordered.' })
    },
    {
      requiredUser: true,
      body: ReorderCarouselBody,
      response: {
        200: ReorderCarouselResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Bulk reorder carousels',
        description: 'Reorder carousels by array of ids',
      },
    }
  )
