import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { GetPostsQuery, UpdatePostBody } from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminPostRepository {
  constructor(private prismaService: PrismaService) {}

  async getPosts(query: GetPostsQuery = { limit: 10, page: 1 }) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    const where = {
      ...(query.search && {
        content: {
          contains: query.search,
          mode: 'insensitive' as const,
        },
      }),
      ...(query.status &&
        query.status.length > 0 && {
          status: {
            in: query.status,
          },
        }),
    }

    return fromRepositoryPromise(async () => {
      const [data, count] = await Promise.all([
        this.prismaService.post.findMany({
          select: {
            feedItemId: true,
            content: true,
            status: true,
            feedItem: {
              select: {
                reactionCounts: true,
                numberOfComments: true,
                publishedAt: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
          take: limit,
          skip,
          orderBy: {
            feedItem: {
              createdAt: 'desc',
            },
          },
          where,
        }),
        this.prismaService.post.count({
          where,
        }),
      ])

      return {
        data: data.map(({ feedItemId, feedItem, ...postData }) => ({
          ...postData,
          id: feedItemId,
          createdAt: feedItem.createdAt,
          updatedAt: feedItem.updatedAt,
          publishedAt: feedItem.publishedAt,
          reactionCounts: feedItem.reactionCounts,
          commentsCount: feedItem.numberOfComments,
        })),
        meta: { count },
      }
    })
  }

  async updatePostById(feedItemId: string, data: UpdatePostBody) {
    return await fromRepositoryPromise(
      this.prismaService.post.update({
        where: { feedItemId },
        data: { status: data.status },
      })
    )
  }

  async deletePostById(feedItemId: string) {
    return await fromRepositoryPromise(
      this.prismaService.feedItem.delete({ where: { id: feedItemId } })
    )
  }
}

export const AdminPostRepositoryPlugin = new Elysia({ name: 'AdminPostRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService }) => ({
    postRepository: new AdminPostRepository(prismaService),
  }))
