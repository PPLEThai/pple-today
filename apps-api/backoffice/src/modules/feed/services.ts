import { FeedItemComment, InternalErrorCode } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { FeedItemReactionType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { CreateFeedReactionBody } from './models'
import { FeedRepository, FeedRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../plugins/file'

export class FeedService {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly fileService: FileService
  ) {}

  async getMyFeed(userId?: string, query?: { cursor?: string; limit?: number }) {
    const feedItems = await this.feedRepository.listFeedItems({
      userId,
      cursor: query?.cursor,
      limit: query?.limit ?? 10,
    })

    if (feedItems.isErr()) {
      return mapRepositoryError(feedItems.error)
    }

    return ok(feedItems.value)
  }

  async getFollowingFeed(userId: string, query?: { cursor?: string; limit?: number }) {
    const followingFeed = await this.feedRepository.listFollowingFeedItems(userId, {
      cursor: query?.cursor,
      limit: query?.limit ?? 10,
    })

    if (followingFeed.isErr()) {
      return mapRepositoryError(followingFeed.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    return ok(followingFeed.value)
  }

  async getTopicFeed(
    topicId: string,
    userId?: string,
    query?: { cursor?: string; limit?: number }
  ) {
    const topicExists = await this.feedRepository.checkTopicExists(topicId)

    if (topicExists.isErr()) {
      return mapRepositoryError(topicExists.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
          message: 'Topic not found',
        },
      })
    }

    const feedItems = await this.feedRepository.listTopicFeedItems({
      userId,
      topicId,
      cursor: query?.cursor,
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
    query?: { cursor?: string; limit?: number }
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

    const feedItems = await this.feedRepository.listHashTagFeedItems({
      userId,
      hashTagId,
      cursor: query?.cursor,
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
    query: { userId?: string; cursor?: string; limit?: number }
  ) {
    const feedComments = await this.feedRepository.getFeedItemComments(feedItemId, {
      userId: query.userId,
      cursor: query.cursor,
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
              profileImage: comment.user.profileImagePath
                ? this.fileService.getPublicFileUrl(comment.user.profileImagePath)
                : undefined,
            },
          }) satisfies FeedItemComment
      )
    )
  }

  async getFeedByUserId(userId?: string, query?: { cursor?: string; limit?: number }) {
    const feedItems = await this.feedRepository.listFeedItemsByUserId(userId, {
      cursor: query?.cursor,
      limit: query?.limit ?? 10,
    })

    if (feedItems.isErr()) {
      return mapRepositoryError(feedItems.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    return ok(feedItems.value)
  }

  async upsertFeedReaction(feedItemId: string, userId: string, data: CreateFeedReactionBody) {
    const comment = data.type === FeedItemReactionType.DOWN_VOTE ? data.comment : undefined
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
      ...result.value,
      comment: result.value.comment
        ? {
            id: result.value.comment.id,
            content: result.value.comment.content,
            createdAt: result.value.comment.createdAt,
            isPrivate: result.value.comment.isPrivate,
            author: {
              id: result.value.comment.user.id,
              name: result.value.comment.user.name,
              profileImage: result.value.comment.user.profileImagePath
                ? this.fileService.getPublicFileUrl(result.value.comment.user.profileImagePath)
                : undefined, // this should be null
            },
          }
        : null,
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

    return ok({
      id: result.value.id,
      content: result.value.content,
      createdAt: result.value.createdAt,
      isPrivate: result.value.isPrivate,
      author: {
        id: result.value.user.id,
        name: result.value.user.name,
        profileImage: result.value.user.profileImagePath
          ? this.fileService.getPublicFileUrl(result.value.user.profileImagePath)
          : undefined, // this should be null
      },
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
