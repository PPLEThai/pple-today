import node from '@elysiajs/node'
import Elysia from 'elysia'

import { GetAboutUsResponse } from './models'
import AboutUsService from './services'

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
      if (result.isErr()) {
        return status(500, {
          error: {
            code: InternalErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
          },
        })
      }

      return status(200, result.value)
    },
    {
      getOIDCUser: true,
      response: {
        200: GetAboutUsResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post('/', async () => {})
  .put('/:id', async () => {})
  .delete('/:id', async () => {})
