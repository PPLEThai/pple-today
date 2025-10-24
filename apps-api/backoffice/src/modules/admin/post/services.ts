import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetPostByIdResponse, GetPostsQuery, GetPostsResponse, UpdatePostBody } from './models'
import { AdminPostRepository, AdminPostRepositoryPlugin } from './repository'

export class AdminPostService {
  constructor(private readonly adminPostRepository: AdminPostRepository) {}

  async getPosts(query: GetPostsQuery = { limit: 10, page: 1 }) {
    const result = await this.adminPostRepository.getPosts(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value satisfies GetPostsResponse)
  }

  async getPostById(postId: string) {
    const result = await this.adminPostRepository.getPostById(postId)

    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetPostByIdResponse)
  }

  async updatePostById(postId: string, data: UpdatePostBody) {
    const updateResult = await this.adminPostRepository.updatePostById(postId, data)

    if (updateResult.isErr())
      return mapRepositoryError(updateResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
        },
      })

    return ok({ message: `Post "${updateResult.value.feedItemId}" updated.` })
  }

  async deletePostById(postId: string) {
    const result = await this.adminPostRepository.deletePostById(postId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
        },
      })

    return ok({ message: `Post "${result.value.feedItemId}" deleted.` })
  }
}

export const AdminPostServicePlugin = new Elysia({
  name: 'AdminPostService',
})
  .use([AdminPostRepositoryPlugin])
  .decorate(({ postRepository }) => ({
    adminPostService: new AdminPostService(postRepository),
  }))
