import { PostReactionType } from '../../dtos/post'
import { prismaClient } from '../../libs/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

abstract class PostRepository {
  static async getPostById(postId: string, userId: string) {
    const response = await fromPrismaPromise(async () => {
      const postResponse = await prismaClient.post.findUniqueOrThrow({
        where: { id: postId },
        include: {
          postTags: {
            include: {
              hashTag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          author: true,
        },
      })

      const postReactions = await prismaClient.postReaction.groupBy({
        _count: {
          id: true,
        },
        by: ['type'],
      })

      const postCommentCount = await prismaClient.postComment.count({
        where: { postId, OR: [{ isPrivate: false }, { authorId: userId, isPrivate: true }] },
      })

      return {
        ...postResponse,
        reactions: postReactions.map((reaction) => ({
          type: reaction.type,
          count: reaction._count.id,
        })),
        commentCount: postCommentCount,
      }
    })

    return response
  }

  static async getPostComments(
    postId: string,
    query: { userId: string; page: number; limit: number }
  ) {
    const { userId, page, limit } = query

    const response = await fromPrismaPromise(
      prismaClient.postComment.findMany({
        where: { postId, OR: [{ isPrivate: false }, { authorId: userId, isPrivate: true }] },
        select: {
          id: true,
          content: true,
          isPrivate: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      })
    )

    return response
  }

  static async createPostReaction(
    postId: string,
    userId: string,
    type: PostReactionType,
    comment?: string
  ) {
    const response = await fromPrismaPromise(
      prismaClient.$transaction(async (tx) => {
        await tx.postReaction.create({
          data: {
            authorId: userId,
            postId,
            type,
          },
        })
        if (type === PostReactionType.DOWN_VOTE) {
          await tx.postComment.create({
            data: {
              authorId: userId,
              postId,
              content: comment ?? '',
              isPrivate: true,
            },
          })
        }
      })
    )

    return response
  }

  static async deletePostReaction(postId: string, userId: string) {
    const response = await fromPrismaPromise(
      prismaClient.postReaction.delete({
        where: {
          postId_authorId: {
            postId: postId,
            authorId: userId,
          },
        },
      })
    )

    return response
  }

  static async createPostComment(
    userId: string,
    postId: string,
    data: {
      content: string
    }
  ) {
    const { content } = data
    const response = await fromPrismaPromise(
      prismaClient.postComment.create({
        data: {
          postId,
          authorId: userId,
          content,
        },
      })
    )

    return response.map((comment) => comment.id)
  }

  static async updatePostComment(
    userId: string,
    postId: string,
    commentId: string,
    data: { content: string }
  ) {
    const response = await fromPrismaPromise(
      prismaClient.postComment.update({
        where: {
          id: commentId,
          postId,
          authorId: userId,
        },
        data: {
          content: data.content,
        },
      })
    )

    return response
  }

  static async deletePostComment(postId: string, commentId: string, userId: string) {
    const response = await fromPrismaPromise(
      prismaClient.postComment.delete({
        where: {
          id: commentId,
          postId,
          authorId: userId,
        },
      })
    )

    return response
  }
}

export default PostRepository
