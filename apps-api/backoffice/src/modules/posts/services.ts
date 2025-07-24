import node from '@elysiajs/node'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { CreatePostReactionBody, GetPostByIdResponse } from './models'
import { PostRepository, PostRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../dtos/error'
import { PostComment, PostReactionType } from '../../dtos/post'
import { mapRawPrismaError } from '../../utils/prisma'

export class PostService {
  constructor(private postRepository: PostRepository) {}

  async getPostById(postId: string, userId?: string) {
    const result = await this.postRepository.getPostById({ postId })
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
        },
      })

    let userReaction: PostReactionType | undefined

    if (userId) {
      const userReactionResult = await this.postRepository.getUserPostReaction({
        postId,
        userId,
      })

      if (userReactionResult.isErr()) {
        return mapRawPrismaError(userReactionResult.error)
      }

      userReaction = userReactionResult.value?.type
    }

    const postDetails = result.value

    return ok({
      id: postId,
      title: postDetails.title,
      content: postDetails.content ?? '',
      author: {
        id: postDetails.feedItem.author.id,
        name: postDetails.feedItem.author.name,
        province: '',
        profileImage: postDetails.feedItem.author.profileImage ?? undefined,
      },
      commentCount: postDetails.feedItem.numberOfComments,
      hashTags: postDetails.feedItem.hashTags.map((tag) => ({
        id: tag.hashTag.id,
        name: tag.hashTag.name,
      })),
      createdAt: postDetails.feedItem.createdAt.toISOString(),
      reactions: postDetails.feedItem.reactionCounts.map((reaction) => ({
        type: reaction.type,
        count: reaction.count,
      })),
      userReaction,
    } satisfies GetPostByIdResponse)
  }

  async getPostComments(postId: string, query: { userId?: string; page?: number; limit?: number }) {
    const postComments = await this.postRepository.getPostComments(postId, {
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

  async createPostReaction(postId: string, userId: string, data: CreatePostReactionBody) {
    const comment = data.type === PostReactionType.DOWN_VOTE ? data.comment : undefined
    const result = await this.postRepository.createPostReaction({
      postId,
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
      message: `Reaction for post ${postId} created.`,
    })
  }

  async deletePostReaction(postId: string, userId: string) {
    const result = await this.postRepository.deletePostReaction({ postId, userId })

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_REACTION_NOT_FOUND,
        },
      })
    }

    return ok({
      message: `Reaction for post ${postId} deleted.`,
    })
  }

  async createPostComment(postId: string, userId: string, content: string) {
    const result = await this.postRepository.createPostComment({ postId, userId, content })

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

  async updatePostComment(postId: string, commentId: string, userId: string, content: string) {
    const result = await this.postRepository.updatePostComment({
      postId,
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

  async deletePostComment(postId: string, commentId: string, userId: string) {
    const result = await this.postRepository.deletePostComment({ postId, commentId, userId })

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_COMMENT_NOT_FOUND,
          message: 'Post comment not found',
        },
      })
    }

    return ok({
      message: `Comment ${commentId} for post ${postId} deleted.`,
    })
  }
}

export const PostServicePlugin = new Elysia({ name: 'PostService', adapter: node() })
  .use(PostRepositoryPlugin)
  .decorate(({ postRepository }) => ({ postService: new PostService(postRepository) }))
