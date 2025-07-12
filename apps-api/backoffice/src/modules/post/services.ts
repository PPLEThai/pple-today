import { ok } from 'neverthrow'

import { CreatePostReactionBody, GetPostByIdResponse } from './models'
import PostRepository from './repository'

abstract class PostService {
  static async getPostById(postId: string, userId: string) {
    const result = await PostRepository.getPostById(postId, userId)
    if (result.isErr()) {
      return result
    }

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
    return await PostRepository.getPostComments(postId, {
      userId: query.userId,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    })
  }

  static async createPostReaction(postId: string, userId: string, data: CreatePostReactionBody) {
    const comment = data.type === 'DOWN_VOTE' ? data.comment : undefined
    const result = await PostRepository.createPostReaction(postId, userId, data.type, comment)

    if (result.isErr()) {
      return result
    }

    return ok({
      message: `Reaction for post ${postId} created.`,
    })
  }

  static async deletePostReaction(postId: string, userId: string) {
    const result = await PostRepository.deletePostReaction(postId, userId)

    if (result.isErr()) {
      return result
    }

    return ok({
      message: `Reaction for post ${postId} deleted.`,
    })
  }

  static async createPostComment(postId: string, userId: string, content: string) {
    const result = await PostRepository.createPostComment(postId, userId, { content })

    if (result.isErr()) {
      return result
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
      return result
    }

    return ok({
      message: `Comment ${commentId} for post ${postId} updated.`,
    })
  }

  static async deletePostComment(postId: string, commentId: string, userId: string) {
    const result = await PostRepository.deletePostComment(postId, commentId, userId)

    if (result.isErr()) {
      return result
    }

    return ok({
      message: `Comment ${commentId} for post ${postId} deleted.`,
    })
  }
}

export default PostService
