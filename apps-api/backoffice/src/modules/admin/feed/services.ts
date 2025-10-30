import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { UpdateFeedItemCommentPrivacyBody } from './models'
import { AdminFeedRepository, AdminFeedRepositoryPlugin } from './repository'

export class AdminFeedService {
  constructor(private readonly feedRepository: AdminFeedRepository) {}

  async updateFeedItemCommentPrivacyById(id: string, data: UpdateFeedItemCommentPrivacyBody) {
    const result = await this.feedRepository.updateFeedItemCommentPrivacy(id, data)

    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_COMMENT_NOT_FOUND,
          message: 'Feed item comment not found',
        },
      })

    return ok()
  }
}

export const AdminFeedServicePlugin = new Elysia({
  name: 'AdminFeedService',
})
  .use([AdminFeedRepositoryPlugin])
  .decorate(({ feedRepository }) => ({
    adminFeedService: new AdminFeedService(feedRepository),
  }))
