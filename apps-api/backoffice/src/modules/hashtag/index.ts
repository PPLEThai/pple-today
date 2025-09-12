import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { GetHashtagParams, GetHashtagResponse } from './models'
import { HashtagServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const HashtagController = new Elysia({
  prefix: '/hashtags',
  tags: ['Hashtags'],
})
  .use(HashtagServicePlugin)
  .use(AuthGuardPlugin)
  .get(
    '/:id',
    async ({ params, status, hashtagService }) => {
      const hashtagId = params.id
      const hashtag = await hashtagService.getHashtagById(hashtagId)
      if (hashtag.isErr()) {
        return mapErrorCodeToResponse(hashtag.error, status)
      }

      return status(200, hashtag.value)
    },
    {
      params: GetHashtagParams,
      response: {
        200: GetHashtagResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.HASHTAG_NOT_FOUND,
          InternalErrorCode.UNAUTHORIZED
        ),
      },
      detail: {
        summary: 'Get hashtag detail',
        description: 'Get hashtag detail',
      },
    }
  )
