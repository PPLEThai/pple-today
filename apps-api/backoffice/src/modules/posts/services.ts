import { ok } from 'neverthrow'

import { CreatePostReactionBody, GetPostByIdResponse } from './models'
import PostRepository from './repository'

import { InternalErrorCode } from '../../dtos/error'
import { mapRawPrismaError } from '../../utils/prisma'

abstract class PostService {
  static async getPostById(postId: string, userId: string) {
    const result = await PostRepository.getPostById(postId, userId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred while fetching the post',
      })

    const postDetails = result.value

    return ok({
      author: {
        id: postDetails.author.id,
        name: postDetails.author.name,
        province: '',
        profileImage: postDetails.author.profileImage ?? undefined,
      },
      commentCount: postDetails.commentCount,
      content: postDetails.content ?? '',
      hashTags: postDetails.postTags.map((tag) => ({
        id: tag.hashTag.id,
        name: tag.hashTag.name,
      })),
      id: postDetails.id,
      createdAt: postDetails.createdAt.toISOString(),
      reactions: postDetails.reactions.map((reaction) => ({
        type: reaction.type,
        count: reaction.count,
      })),
      title: postDetails.title,
    } satisfies GetPostByIdResponse)
  }

  static async getPostComments(
    postId: string,
    query: { userId: string; page?: number; limit?: number }
  ) {
    const postComments = await PostRepository.getPostComments(postId, {
      userId: query.userId,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    })

    if (postComments.isErr())
      return mapRawPrismaError(postComments.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred while fetching the post comments',
      })

    return ok(postComments.value)
  }

  static async createPostReaction(postId: string, userId: string, data: CreatePostReactionBody) {
    const comment = data.type === 'DOWN_VOTE' ? data.comment : undefined
    const result = await PostRepository.createPostReaction(postId, userId, data.type, comment)

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.POST_REACTION_ALREADY_EXISTS,
        },
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred while creating the post reaction',
      })
    }

    return ok({
      message: `Reaction for post ${postId} created.`,
    })
  }

  static async deletePostReaction(postId: string, userId: string) {
    const result = await PostRepository.deletePostReaction(postId, userId)

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_REACTION_NOT_FOUND,
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred while deleting the post reaction',
      })
    }

    return ok({
      message: `Reaction for post ${postId} deleted.`,
    })
  }

  static async createPostComment(postId: string, userId: string, content: string) {
    const result = await PostRepository.createPostComment(postId, userId, { content })

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_NOT_FOUND,
          message: 'Post not found',
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred while creating the create comment',
      })
    }

    return ok({
      id: result.value,
    })
  }

  static async updatePostComment(
    postId: string,
    commentId: string,
    userId: string,
    content: string
  ) {
    const result = await PostRepository.updatePostComment(postId, commentId, userId, { content })

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_COMMENT_NOT_FOUND,
          message: 'Post comment not found',
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred while updating the post comment',
      })
    }

    return ok({
      message: `Comment ${commentId} for post ${postId} updated.`,
    })
  }

  static async deletePostComment(postId: string, commentId: string, userId: string) {
    const result = await PostRepository.deletePostComment(postId, commentId, userId)

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POST_COMMENT_NOT_FOUND,
          message: 'Post comment not found',
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred while deleting the post comment',
      })
    }

    return ok({
      message: `Comment ${commentId} for post ${postId} deleted.`,
    })
  }
}

export default PostService
