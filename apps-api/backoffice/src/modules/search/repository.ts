import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class SearchRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async searchAnnouncements(query: { search: string; limit?: number; cursor?: string }) {
    return await fromRepositoryPromise(
      this.prismaService.announcement.findMany({
        where: {
          OR: [
            {
              title: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              content: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          ],
        },
        take: query.limit ?? 3,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor ? { feedItemId: query.cursor } : undefined,
        orderBy: {
          feedItem: {
            createdAt: 'desc',
          },
        },
        select: {
          feedItemId: true,
          title: true,
          type: true,
          topics: {
            select: {
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
    )
  }

  async searchPosts(query: { search: string; userId?: string; limit?: number; cursor?: string }) {
    return await fromRepositoryPromise(
      this.prismaService.post.findMany({
        where: {
          content: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        take: query.limit ?? 3,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor ? { feedItemId: query.cursor } : undefined,
        orderBy: {
          feedItem: {
            createdAt: 'desc',
          },
        },
        include: {
          feedItem: {
            include: {
              author: true,
              announcement: {
                include: {
                  attachments: true,
                },
              },
              reactions: query.userId
                ? {
                    where: { userId: query.userId },
                  }
                : undefined,
              reactionCounts: true,
            },
          },
          hashTags: {
            include: {
              hashTag: true,
            },
          },
          attachments: true,
        },
      })
    )
  }

  async searchHashtags(query: { search: string; limit?: number; cursor?: string }) {
    if (query.search[0] !== '#') {
      return ok([])
    }

    return await fromRepositoryPromise(
      this.prismaService.hashTag.findMany({
        where: {
          name: {
            startsWith: query.search.slice(1),
            mode: 'insensitive',
          },
          status: 'PUBLISH',
        },
        take: query.limit ?? 3,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor ? { id: query.cursor } : undefined,
        select: {
          id: true,
          name: true,
        },
      })
    )
  }

  async searchTopics(query: { search: string; limit?: number; cursor?: string }) {
    return await fromRepositoryPromise(
      this.prismaService.topic.findMany({
        where: {
          name: {
            startsWith: query.search,
            mode: 'insensitive',
          },
          status: 'PUBLISH',
        },
        take: query.limit ?? 3,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor ? { id: query.cursor } : undefined,
        orderBy: {
          followedTopics: {
            _count: 'desc',
          },
        },
        select: {
          id: true,
          name: true,
        },
      })
    )
  }

  async searchUsers(query: { search: string; limit?: number; cursor?: string }) {
    return await fromRepositoryPromise(
      this.prismaService.user.findMany({
        where: {
          name: {
            startsWith: query.search,
            mode: 'insensitive',
          },
        },
        take: query.limit ?? 3,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor ? { id: query.cursor } : undefined,
        orderBy: [
          {
            numberOfFollowers: 'desc',
          },
          {
            numberOfPosts: 'desc',
          },
        ],
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      })
    )
  }
}

export const SearchRepositoryPlugin = new Elysia({
  name: 'SearchRepository',
})
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({ searchRepository: new SearchRepository(prismaService) }))
