import node from '@elysiajs/node'
import Elysia from 'elysia'

import { FeedItemType } from '../../../__generated__/prisma'
import { PostReactionType } from '../../dtos/post'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'
import { FeedRepository, FeedRepositoryPlugin } from '../feeds/repository'

export class PostRepository {
  constructor(
    private prismaService: PrismaService,
    private feedRepository: FeedRepository
  ) {}

  async getUserPostReaction({ postId, userId }: { postId: string; userId: string }) {
    return await this.feedRepository.getFeedItemReactionByUserId({
      feedItemId: postId,
      userId,
    })
  }

  async getPostById({ postId }: { postId: string }) {
    return await fromPrismaPromise(
      this.prismaService.post.findUniqueOrThrow({
        where: { feedItemId: postId },
        select: {
          title: true,
          content: true,
          images: {
            select: {
              id: true,
              url: true,
              createdAt: true,
            },
          },
          hashTags: {
            select: {
              hashTag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          feedItem: {
            select: {
              createdAt: true,
              numberOfComments: true,
              reactionCounts: {
                select: {
                  type: true,
                  count: true,
                },
              },
              author: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      })
    )
  }

  async getPostComments(postId: string, query: { userId?: string; page: number; limit: number }) {
    return await this.feedRepository.getFeedItemComments(postId, {
      ...query,
      feedItemType: FeedItemType.POST,
    })
  }

  async createPostReaction({
    postId,
    userId,
    type,
    content,
  }: {
    postId: string
    userId: string
    type: PostReactionType
    content?: string
  }) {
    return await this.feedRepository.createFeedItemReaction({
      feedItemId: postId,
      userId,
      type,
      content,
    })
  }

  async updatePostReaction({
    userId,
    postId,
    type,
    content,
  }: {
    userId: string
    postId: string
    type: PostReactionType
    content?: string
  }) {
    return await this.feedRepository.updateFeedItemReaction({
      feedItemId: postId,
      userId,
      type,
      content,
    })
  }

  async deletePostReaction({ userId, postId }: { userId: string; postId: string }) {
    return await this.feedRepository.deleteFeedItemReaction({ feedItemId: postId, userId })
  }

  async createPostComment({
    userId,
    postId,
    content,
  }: {
    userId: string
    postId: string
    content: string
  }) {
    return await this.feedRepository.createFeedItemComment({
      feedItemId: postId,
      userId,
      content,
      isPrivate: false,
    })
  }

  async updatePostComment({
    userId,
    postId,
    commentId,
    content,
  }: {
    userId: string
    postId: string
    commentId: string
    content: string
  }) {
    return await this.feedRepository.updateFeedItemComment({
      commentId,
      feedItemId: postId,
      userId,
      content,
    })
  }

  async deletePostComment({
    userId,
    postId,
    commentId,
  }: {
    userId: string
    postId: string
    commentId: string
  }) {
    return await this.feedRepository.deleteFeedItemComment({
      commentId,
      userId,
      feedItemId: postId,
    })
  }
}

export const PostRepositoryPlugin = new Elysia({ name: 'PostRepository', adapter: node() })
  .use([PrismaServicePlugin, FeedRepositoryPlugin])
  .decorate(({ prismaService, feedRepository }) => ({
    postRepository: new PostRepository(prismaService, feedRepository),
  }))
