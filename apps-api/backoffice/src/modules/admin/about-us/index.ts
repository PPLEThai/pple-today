import Elysia, { t } from 'elysia'

import {
  CreateAboutUsResponse,
  DeleteAboutUsResponse,
  GetAboutUsResponse,
  UpdateAboutUsResponse,
} from './models'
import { AboutUsServicePlugin } from './services'

import { AboutUs } from '../../../dtos/about-us'
import { InternalErrorCode } from '../../../dtos/error'
import { AuthGuardPlugin } from '../../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../../utils/error'

export const AdminAboutUsController = new Elysia({
  prefix: '/about-us',
  tags: ['About Us'],
})
  .use([AuthGuardPlugin, AboutUsServicePlugin])
  .get(
    '/',
    async ({ status, aboutUsService }) => {
      const result = await aboutUsService.getAboutUs()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredUser: true,
      response: {
        200: GetAboutUsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get About Us',
        description: 'Fetch all About Us entries',
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
      requiredUser: true,
      body: t.Omit(AboutUs, ['id']),
      response: {
        201: CreateAboutUsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Create About Us',
        description: 'Add a new entry to About Us',
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
      requiredUser: true,
      params: t.Pick(AboutUs, ['id']),
      body: t.Omit(AboutUs, ['id']),
      response: {
        200: UpdateAboutUsResponse,
        ...createErrorSchema(
          InternalErrorCode.ABOUT_US_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update About Us',
        description: 'Modify an existing About Us entry by its ID',
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
      requiredUser: true,
      params: t.Pick(AboutUs, ['id']),
      response: {
        200: DeleteAboutUsResponse,
        ...createErrorSchema(
          InternalErrorCode.ABOUT_US_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete About Us',
        description: 'Remove an About Us entry by its ID',
      },
    }
  )
