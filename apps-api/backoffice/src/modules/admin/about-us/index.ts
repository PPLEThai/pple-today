import node from '@elysiajs/node'
import Elysia, { t } from 'elysia'
import { match } from 'ts-pattern'

import {
  CreateAboutUsResponse,
  DeleteAboutUsResponse,
  GetAboutUsResponse,
  UpdateAboutUsResponse,
} from './models'
import AboutUsService from './services'

import { AboutUs } from '../../../dtos/about-us'
import { InternalErrorCode } from '../../../dtos/error'
import { authPlugin } from '../../../plugins/auth'
import { createErrorSchema } from '../../../utils/error'

export const aboutUsController = new Elysia({
  adapter: node(),
  prefix: '/admin/about-us',
})
  .use(authPlugin)
  .get(
    '/',
    async ({ status }) => {
      const result = await AboutUsService.getAboutUs()
      if (result.isErr())
        return status(500, {
          error: {
            code: InternalErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
          },
        })

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
    async ({ body, status }) => {
      const result = await AboutUsService.createAboutUs(body)
      if (result.isErr())
        return status(500, {
          error: {
            code: InternalErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
          },
        })

      return result.value
    },
    {
      getOIDCUser: true,
      body: t.Omit(AboutUs, ['id']),
      response: {
        200: CreateAboutUsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .put(
    '/:id',
    async ({ params, body, status }) => {
      const result = await AboutUsService.updateAboutUs(params.id, body)

      if (result.isErr()) {
        return match(result.error)
          .with({ code: 'RECORD_NOT_FOUND' }, () =>
            status(404, {
              error: { code: InternalErrorCode.ABOUT_US_NOT_FOUND, message: 'About us not found' },
            })
          )
          .otherwise(() => {
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
              },
            })
          })
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
    async ({ params, status }) => {
      const result = await AboutUsService.deleteAboutUs(params.id)

      if (result.isErr()) {
        return match(result.error)
          .with({ code: 'RECORD_NOT_FOUND' }, () =>
            status(404, {
              error: { code: InternalErrorCode.ABOUT_US_NOT_FOUND, message: 'About us not found' },
            })
          )
          .otherwise(() => {
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
              },
            })
          })
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
