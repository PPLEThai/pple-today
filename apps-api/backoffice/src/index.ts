import { cors } from '@elysiajs/cors'
import node from '@elysiajs/node'
import { swagger } from '@elysiajs/swagger'
import Elysia, { t } from 'elysia'

import serverEnv from './config/env'
import { InternalErrorCode } from './dtos/error'
import { authController } from './modules/auth'
import { postsController } from './modules/posts'
import { profileController } from './modules/profile'

const app = new Elysia({ adapter: node() })
  .onError(({ status, code, error }) => {
    if ('response' in error) return status(error.code, error.response)
    if (code === 'INTERNAL_SERVER_ERROR')
      return status(500, {
        error: {
          code: InternalErrorCode.INTERNAL_SERVER_ERROR,
          message: 'An internal error occurred',
        },
      })

    if (code === 'VALIDATION')
      return status(422, {
        error: {
          code: InternalErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          data: error.message,
        },
      })

    if (code === 'NOT_FOUND')
      return status(404, {
        error: {
          code: InternalErrorCode.NOT_FOUND,
          message: 'Resource not found',
        },
      })

    if (code === 'INVALID_FILE_TYPE')
      return status(400, {
        error: {
          code: InternalErrorCode.BAD_REQUEST,
          message: 'Invalid file type',
        },
      })

    return status(500, {
      error: {
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An internal error occurred',
      },
    })
  })
  .use(cors())
  .use(swagger())
  .use(postsController)
  .use(authController)
  .use(profileController)
  .get(
    '/:id',
    ({ params, query, headers }) => {
      console.log('Headers:', headers)
      return {
        message: `Hello, ${params.id}!`,
        params,
        query,
        headers,
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        name: t.Optional(t.String()),
        code: t.Optional(t.Number()),
      }),
      response: t.Object({
        message: t.String(),
        params: t.Object({
          id: t.String(),
        }),
        query: t.Object({
          name: t.Optional(t.String()),
          code: t.Optional(t.Number()),
        }),
        headers: t.Record(t.String(), t.Any()),
      }),
      headers: t.Object({
        'x-custom-header': t.Optional(t.String()),
      }),
    }
  )
  .post(
    '/test-post/:id',
    ({ params, query, headers, body }) => {
      console.log('Headers:', headers)
      return {
        message: `Hello, ${params.id}!`,
        params,
        query,
        body,
        headers,
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        name: t.Optional(t.String()),
        code: t.Optional(t.Number()),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        code: t.Optional(t.Number()),
      }),
      response: t.Object({
        message: t.String(),
        params: t.Object({
          id: t.String(),
        }),
        query: t.Object({
          name: t.Optional(t.String()),
          code: t.Optional(t.Number()),
        }),
        headers: t.Record(t.String(), t.Any()),
      }),
      headers: t.Object({
        'x-custom-header': t.Optional(t.String()),
      }),
    }
  )
  .listen(serverEnv.PORT, () => {
    console.log(`Server is running on http://localhost:${serverEnv.PORT}`)
  })

export type ApiSchema = typeof app
