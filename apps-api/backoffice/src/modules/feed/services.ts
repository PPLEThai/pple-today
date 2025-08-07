import node from '@elysiajs/node'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { CreateFeedReactionBody, GetFeedContentResponse } from './models'
import { FeedRepository, FeedRepositoryPlugin } from './repository'

import { FeedItemType } from '../../../__generated__/prisma'
import { InternalErrorCode } from '../../dtos/error'
import { FeedItemBaseContent } from '../../dtos/feed'
import { PostComment, PostReactionType } from '../../dtos/post'
import { err, exhaustiveGuard } from '../../utils/error'
import { mapRawPrismaError } from '../../utils/prisma'

export class FeedService {
  constructor(private feedRepository: FeedRepository) {}

  async getFeedContentById(feedId: string, userId?: string) {
    const feedItem = await this.feedRepository.getFeedItemById(feedId, userId)

    if (feedItem.isErr()) {
      return mapRawPrismaError(feedItem.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
          message: 'Feed item not found',
        },
      })
    }

    const feedItemBaseContent: FeedItemBaseContent = {
      id: feedItem.value.id,
      createdAt: feedItem.value.createdAt,
      commentCount: feedItem.value.numberOfComments,
      userReaction: feedItem.value.reactions?.[0]?.type,
      reactions: feedItem.value.reactionCounts,
      author: {
        id: feedItem.value.author.id,
        name: feedItem.value.author.name,
        profileImage: feedItem.value.author.profileImage ?? undefined,
        province: '',
      },
    }

    switch (feedItem.value.type) {
      case FeedItemType.POLL:
        if (!feedItem.value.poll) {
          return err({
            code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
            message: 'Feed item content not found',
          })
        }

        return ok({
          ...feedItemBaseContent,
          type: FeedItemType.POLL,
          poll: {
            title: feedItem.value.poll.title,
            options: feedItem.value.poll.options.map((option) => ({
              id: option.id,
              title: option.title,
              isSelected: (option.pollAnswers ?? []).length > 0,
              votes: (option.pollAnswers ?? []).length,
            })),
            endAt: feedItem.value.poll.endAt,
            totalVotes: feedItem.value.poll.options.reduce(
              (acc, option) => acc + (option.pollAnswers ?? []).length,
              0
            ),
          },
        } satisfies GetFeedContentResponse)
      case FeedItemType.ANNOUNCEMENT:
        if (!feedItem.value.announcement) {
          return err({
            code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
            message: 'Feed item content not found',
          })
        }

        return ok({
          ...feedItemBaseContent,
          type: FeedItemType.ANNOUNCEMENT,
          announcement: {
            content: feedItem.value.announcement.content ?? '',
            title: feedItem.value.announcement.title,
            attachments: feedItem.value.announcement.attachments.map(
              (attachment) => attachment.url
            ),
          },
        } satisfies GetFeedContentResponse)
      case FeedItemType.POST:
        if (!feedItem.value.post) {
          return err({
            code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
            message: 'Feed item content not found',
          })
        }

        return ok({
          ...feedItemBaseContent,
          type: FeedItemType.POST,
          post: {
            content: feedItem.value.post.content ?? '',
            hashTags: feedItem.value.post.hashTags.map(({ hashTag }) => ({
              id: hashTag.id,
              name: hashTag.name,
            })),
            attachments: feedItem.value.post.images.map((image) => ({
              id: image.id,
              url: image.url,
              // TODO: Add type for attachments
              type: '',
            })),
          },
        } satisfies GetFeedContentResponse)
      default:
        exhaustiveGuard(feedItem.value.type)
    }
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
      return mapRawPrismaError(feedComments.error, {
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
              profileImage: comment.user.profileImage ?? undefined,
              province: '',
            },
          }) satisfies PostComment
      )
    )
  }

  async createFeedReaction(feedItemId: string, userId: string, data: CreateFeedReactionBody) {
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
          code: InternalErrorCode.FEED_ITEM_REACTION_ALREADY_EXISTS,
        },
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
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
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
          message: 'Feed item not found',
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
      return mapRawPrismaError(result.error, {
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

export const FeedServicePlugin = new Elysia({ name: 'FeedService', adapter: node() })
  .use(FeedRepositoryPlugin)
  .decorate(({ feedRepository }) => ({ feedService: new FeedService(feedRepository) }))
