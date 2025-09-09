import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { CreateFeedReactionBody } from './models'
import { FeedRepository, FeedRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../dtos/error'
import { PostComment, PostReactionType } from '../../dtos/post'
import { mapRepositoryError } from '../../utils/error'
import { FileService, FileServicePlugin } from '../file/services'

export class FeedService {
  constructor(
    private feedRepository: FeedRepository,
    private readonly fileService: FileService
  ) {}

  async getMyFeed(userId?: string, query?: { page?: number; limit?: number }) {
    // TODO: Use recommendation from dedicated recommendation service
    const feedItems = await this.feedRepository.listFeedItems({
      userId,
      page: query?.page ?? 1,
      limit: query?.limit ?? 10,
    })

    if (feedItems.isErr()) {
      return mapRepositoryError(feedItems.error)
    }

    return ok(feedItems.value)
  }

  async getTopicFeed(topicId: string, userId?: string, query?: { page?: number; limit?: number }) {
    const topicExists = await this.feedRepository.checkTopicExists(topicId)

    if (topicExists.isErr()) {
      return mapRepositoryError(topicExists.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
          message: 'Topic not found',
        },
      })
    }

    // TODO: Use recommendation from dedicated recommendation service
    const feedItems = await this.feedRepository.listTopicFeedItems({
      userId,
      topicId,
      page: query?.page ?? 1,
      limit: query?.limit ?? 10,
    })

    if (feedItems.isErr()) {
      return mapRepositoryError(feedItems.error)
    }

    return ok(feedItems.value)
  }

  async getHashTagFeed(
    hashTagId: string,
    userId?: string,
    query?: { page?: number; limit?: number }
  ) {
    const hashTagExists = await this.feedRepository.checkHashTagExists(hashTagId)

    if (hashTagExists.isErr()) {
      return mapRepositoryError(hashTagExists.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
          message: 'Topic not found',
        },
      })
    }

    // TODO: Use recommendation from dedicated recommendation service
    const feedItems = await this.feedRepository.listHashTagFeedItems({
      userId,
      hashTagId,
      page: query?.page ?? 1,
      limit: query?.limit ?? 10,
    })

    if (feedItems.isErr()) {
      return mapRepositoryError(feedItems.error)
    }

    return ok(feedItems.value)
  }

  async getFeedContentById(feedId: string, userId?: string) {
    const feedItem = await this.feedRepository.getFeedItemById(feedId, userId)

    if (feedItem.isErr()) {
      return mapRepositoryError(feedItem.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
          message: 'Feed item not found',
        },
      })
    }

    return ok(feedItem.value)
  }

  async getFeedComments(
    feedItemId: string,
    query: { userId?: string; page?: number; limit?: number }
  ) {
    const feedComments = await this.feedRepository.getFeedItemComments(feedItemId, {
      userId: query.userId,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    })

    if (feedComments.isErr())
      return mapRepositoryError(feedComments.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
        },
      })

    return ok(
      feedComments.value.map(
        (comment) =>
          ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            isPrivate: comment.isPrivate,
            author: {
              id: comment.user.id,
              name: comment.user.name,
              address: comment.user.address ?? undefined,
              profileImage: comment.user.profileImage
                ? this.fileService.getPublicFileUrl(comment.user.profileImage)
                : undefined,
            },
          }) satisfies PostComment
      )
    )
  }

  async upsertFeedReaction(feedItemId: string, userId: string, data: CreateFeedReactionBody) {
    const comment = data.type === PostReactionType.DOWN_VOTE ? data.comment : undefined
    const result = await this.feedRepository.upsertFeedItemReaction({
      feedItemId,
      userId,
      type: data.type,
      content: comment,
    })

    if (result.isErr()) {
      return mapRepositoryError(result.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.FEED_ITEM_REACTION_ALREADY_EXISTS,
        },
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
        },
      })
    }

    return ok({
      message: `Reaction for feed item ${feedItemId} updated.`,
    })
  }

  async deleteFeedReaction(feedItemId: string, userId: string) {
    const result = await this.feedRepository.deleteFeedItemReaction({ feedItemId, userId })

    if (result.isErr()) {
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_REACTION_NOT_FOUND,
          message: `Feed item reaction not found.`,
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
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
          message: 'Feed item not found',
        },
      })
    }

    return ok({ ...result.value, author: result.value.user })
  }

  async updateFeedComment(postId: string, commentId: string, userId: string, content: string) {
    const result = await this.feedRepository.updateFeedItemComment({
      feedItemId: postId,
      commentId,
      userId,
      content,
    })

    if (result.isErr()) {
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_COMMENT_NOT_FOUND,
          message: 'Feed comment not found',
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
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_COMMENT_NOT_FOUND,
          message: 'Feed comment not found',
        },
      })
    }

    return ok({
      message: `Comment ${commentId} for feed item ${feedItemId} deleted.`,
    })
  }
}

export const FeedServicePlugin = new Elysia({ name: 'FeedService' })
  .use([FeedRepositoryPlugin, FileServicePlugin])
  .decorate(({ feedRepository, fileService }) => ({
    feedService: new FeedService(feedRepository, fileService),
  }))
