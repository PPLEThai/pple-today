import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  UpdateFeedItemCommentPrivacyBody,
  UpdateFeedItemCommentPrivacyParams,
  UpdateFeedItemCommentPrivacyResponse,
} from './models'
import { AdminFeedServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminFeedController = new Elysia({
  prefix: '/feeds',
  tags: ['Admin Feed'],
})
  .use([AdminFeedServicePlugin, AdminAuthGuardPlugin])
  .patch(
    '/comments/:id',
    async ({ params, body, adminFeedService, status }) => {
      const result = await adminFeedService.updateFeedItemCommentPrivacyById(params.id, body)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }
      return status(200, { message: 'Feed item comment privacy updated.' })
    },
    {
      requiredLocalUser: true,
      params: UpdateFeedItemCommentPrivacyParams,
      body: UpdateFeedItemCommentPrivacyBody,
      response: {
        200: UpdateFeedItemCommentPrivacyResponse,
        ...createErrorSchema(
          InternalErrorCode.FEED_ITEM_COMMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update feed item comment privacy',
        description: "Update a specific feed item comment's privacy item by id",
      },
    }
  )
