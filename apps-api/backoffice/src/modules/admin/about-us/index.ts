import node from '@elysiajs/node'
import Elysia, { t } from 'elysia'

import {
  CreateAboutUsResponse,
  DeleteAboutUsResponse,
  GetAboutUsResponse,
  UpdateAboutUsResponse,
} from './models'
import AboutUsService from './services'

import { AboutUs } from '../../../dtos/about-us'
import { InternalErrorCode } from '../../../dtos/error'
import { AuthPlugin } from '../../../plugins/auth'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../../utils/error'

export const aboutUsController = new Elysia({
  prefix: '/admin/about-us',
  adapter: node(),
})
  .use([AuthPlugin, AboutUsService])
  .get(
    '/',
    async ({ status, aboutUsService }) => {
      const result = await aboutUsService.getAboutUs()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      getOIDCUser: true,
      response: {
        200: GetAboutUsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .post(
    '/',
    async ({ body, status, aboutUsService }) => {
      const result = await aboutUsService.createAboutUs(body)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(201, result.value)
    },
    {
      getOIDCUser: true,
      body: t.Omit(AboutUs, ['id']),
      response: {
        201: CreateAboutUsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .put(
    '/:id',
    async ({ params, body, status, aboutUsService }) => {
      const result = await aboutUsService.updateAboutUs(params.id, body)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.ABOUT_US_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      getOIDCUser: true,
      params: t.Pick(AboutUs, ['id']),
      body: t.Omit(AboutUs, ['id']),
      response: {
        200: UpdateAboutUsResponse,
        ...createErrorSchema(
          InternalErrorCode.ABOUT_US_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .delete(
    '/:id',
    async ({ params, status, aboutUsService }) => {
      const result = await aboutUsService.deleteAboutUs(params.id)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.ABOUT_US_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      getOIDCUser: true,
      params: t.Pick(AboutUs, ['id']),
      response: {
        200: DeleteAboutUsResponse,
        ...createErrorSchema(
          InternalErrorCode.ABOUT_US_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
