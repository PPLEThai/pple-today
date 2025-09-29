import { FeedItem } from '@pple-today/api-common/dtos'
import { PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { HashTagStatus, TopicStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { Ok, ok } from 'neverthrow'
import * as R from 'remeda'

import { PrismaServicePlugin } from '../../plugins/prisma'
import { FeedRepository, FeedRepositoryPlugin } from '../feed/repository'

// TODO: Optimize queries with full-text search if needed
export class SearchRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly feedRepository: FeedRepository
  ) {}

  async getKeywords(query: { search: string; limit?: number }) {
    return await fromRepositoryPromise(async () => {
      const feedItemCandidates = await this.prismaService.feedItem.findMany({
        where: {
          OR: [
            {
              post: {
                content: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
            {
              poll: {
                description: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        },
        select: {
          post: {
            select: {
              content: true,
            },
          },
          poll: {
            select: {
              description: true,
            },
          },
        },
        take: query.limit ?? 10,
      })

      const keywords = R.pipe(
        feedItemCandidates,
        R.flatMap((fi) =>
          R.pipe(
            fi.post?.content ?? fi.poll?.description ?? '',
            R.split(/\s/g),
            R.filter((word) => word.toLowerCase().includes(query.search.toLowerCase()))
          )
        ),
        R.unique(),
        R.shuffle(),
        R.take(query.limit ?? 10)
      )

      return keywords
    })
  }

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

  async searchFeedItems(query: {
    search: string
    userId?: string
    limit?: number
    cursor?: string
  }) {
    const rawFeedItems = await fromRepositoryPromise(
      this.prismaService.feedItem.findMany({
        where: {
          OR: [
            {
              post: {
                content: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
            {
              poll: {
                description: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        },
        take: query.limit ?? 3,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor ? { id: query.cursor } : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        include: this.feedRepository.constructFeedItemInclude(query.userId),
      })
    )

    if (rawFeedItems.isErr()) return err(rawFeedItems.error)

    const feedItems = rawFeedItems.value.map((item) =>
      this.feedRepository.transformToFeedItem(item)
    )
    const feedItemErr = feedItems.find((item) => item.isErr())

    if (feedItemErr) {
      return err(feedItemErr.error)
    }

    return ok(feedItems.map((feedItem) => (feedItem as Ok<FeedItem, never>).value))
  }

  async searchHashtags(query: { search: string; limit?: number; cursor?: string }) {
    if (query.search[0] !== '#') {
      return ok([])
    }

    return await fromRepositoryPromise(
      this.prismaService.hashTag.findMany({
        where: {
          status: HashTagStatus.PUBLISH,
          name: {
            startsWith: query.search,
            mode: 'insensitive',
          },
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
          status: TopicStatus.PUBLISH,
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
          roles: {
            none: {
              role: 'official',
            },
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
          profileImagePath: true,
        },
      })
    )
  }
}

export const SearchRepositoryPlugin = new Elysia({
  name: 'SearchRepository',
})
  .use([PrismaServicePlugin, FeedRepositoryPlugin])
  .decorate(({ prismaService, feedRepository }) => ({
    searchRepository: new SearchRepository(prismaService, feedRepository),
  }))
