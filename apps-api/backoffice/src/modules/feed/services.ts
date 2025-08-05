import node from '@elysiajs/node'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { CreatePostReactionBody } from './models'
import { FeedRepository, FeedRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../dtos/error'
import { PostComment, PostReactionType } from '../../dtos/post'
import { mapRawPrismaError } from '../../utils/prisma'

export class FeedService {
  constructor(private feedRepository: FeedRepository) {}

  async getFeedComments(postId: string, query: { userId?: string; page?: number; limit?: number }) {
    const postComments = await this.feedRepository.getFeedItemComments(postId, {
      userId: query.userId,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    })

    if (postComments.isErr())
      return mapRawPrismaError(postComments.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
        },
      })

    return ok(
      postComments.value.map(
        (comment) =>
          ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            isPrivate: comment.isPrivate,
            author: {
              id: comment.user.id,
              name: comment.user.name,
              profileImage: comment.user.profileImage ?? undefined,
              province: '',
            },
          }) satisfies PostComment
      )
    )
  }

  async createFeedReaction(feedItemId: string, userId: string, data: CreatePostReactionBody) {
    const comment = data.type === PostReactionType.DOWN_VOTE ? data.comment : undefined
    const result = await this.feedRepository.createFeedItemReaction({
      feedItemId,
      userId,
      type: data.type,
      content: comment,
    })

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.POST_REACTION_ALREADY_EXISTS,
        },
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
        },
      })
    }

    return ok({
      message: `Reaction for feed item ${feedItemId} created.`,
    })
  }

  async deleteFeedReaction(feedItemId: string, userId: string) {
    const result = await this.feedRepository.deleteFeedItemReaction({ feedItemId, userId })

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_REACTION_NOT_FOUND,
        },
      })
    }

    return ok({
      message: `Reaction for feed item ${feedItemId} deleted.`,
    })
  }

  async createFeedComment(feedItemId: string, userId: string, content: string) {
    const result = await this.feedRepository.createFeedItemComment({
      feedItemId,
      userId,
      content,
      isPrivate: false,
    })

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
          message: 'Post not found',
        },
      })
    }

    return ok({
      id: result.value,
    })
  }

  async updateFeedComment(postId: string, commentId: string, userId: string, content: string) {
    const result = await this.feedRepository.updateFeedItemComment({
      feedItemId: postId,
      commentId,
      userId,
      content,
    })

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_COMMENT_NOT_FOUND,
          message: 'Post comment not found',
        },
      })
    }

    return ok({
      message: `Comment ${commentId} for post ${postId} updated.`,
    })
  }

  async deleteFeedComment(feedItemId: string, commentId: string, userId: string) {
    const result = await this.feedRepository.deleteFeedItemComment({
      feedItemId,
      commentId,
      userId,
    })

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_COMMENT_NOT_FOUND,
          message: 'Post comment not found',
        },
      })
    }

    return ok({
      message: `Comment ${commentId} for feed item ${feedItemId} deleted.`,
    })
  }
}

export const FeedServicePlugin = new Elysia({ name: 'FeedService', adapter: node() })
  .use(FeedRepositoryPlugin)
  .decorate(({ feedRepository }) => ({ feedService: new FeedService(feedRepository) }))
