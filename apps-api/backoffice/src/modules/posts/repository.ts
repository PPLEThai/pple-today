import Elysia from 'elysia'

import { PostReactionType } from '../../dtos/post'
import PrismaService from '../../libs/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export const PostRepository = new Elysia({ name: 'PostRepository' })
  .use(PrismaService)
  .derive(({ prisma }) => ({
    postRepository: {
      async getPostById(postId: string, userId: string) {
        const response = await fromPrismaPromise(async () => {
          const postResponse = await prisma.post.findUniqueOrThrow({
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

          const postReactions = await prisma.postReaction.groupBy({
            _count: {
              id: true,
            },
            by: ['type'],
          })

          const postCommentCount = await prisma.postComment.count({
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
      },

      async getPostComments(
        postId: string,
        query: { userId: string; page: number; limit: number }
      ) {
        const { userId, page, limit } = query

        const response = await fromPrismaPromise(
          prisma.postComment.findMany({
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
      },

      async createPostReaction(
        postId: string,
        userId: string,
        type: PostReactionType,
        comment?: string
      ) {
        const response = await fromPrismaPromise(
          prisma.$transaction(async (tx) => {
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
      },

      async deletePostReaction(postId: string, userId: string) {
        const response = await fromPrismaPromise(
          prisma.postReaction.delete({
            where: {
              postId_authorId: {
                postId: postId,
                authorId: userId,
              },
            },
          })
        )

        return response
      },

      async createPostComment(
        userId: string,
        postId: string,
        data: {
          content: string
        }
      ) {
        const { content } = data
        const response = await fromPrismaPromise(
          prisma.postComment.create({
            data: {
              postId,
              authorId: userId,
              content,
            },
          })
        )

        return response.map((comment) => comment.id)
      },

      async updatePostComment(
        userId: string,
        postId: string,
        commentId: string,
        data: { content: string }
      ) {
        const response = await fromPrismaPromise(
          prisma.postComment.update({
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
      },

      async deletePostComment(postId: string, commentId: string, userId: string) {
        const response = await fromPrismaPromise(
          prisma.postComment.delete({
            where: {
              id: commentId,
              postId,
              authorId: userId,
            },
          })
        )

        return response
      },
    },
  }))
  .as('scoped')
