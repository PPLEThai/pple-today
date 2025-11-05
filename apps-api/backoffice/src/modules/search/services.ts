import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  GetSearchAnnouncementResponse,
  GetSearchFeedItemsResponse,
  GetSearchKeywordResponse,
  GetSearchUsersResponse,
} from './models'
import { SearchRepository, SearchRepositoryPlugin } from './repository'

import { FileServerService, FileServerServicePlugin } from '../files/services'

export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly fileServerService: FileServerService
  ) {}

  async searchKeywords(query: { search: string }) {
    const [userResult, topicResult, keywordResult] = await Promise.all([
      this.searchRepository.searchUsers({
        search: query.search,
        limit: 3,
      }),
      this.searchRepository.searchTopics({
        search: query.search,
        limit: 3,
      }),
      this.searchRepository.getKeywords({
        search: query.search,
        limit: 4,
      }),
    ])

    if (userResult.isErr()) return mapRepositoryError(userResult.error)
    if (topicResult.isErr()) return mapRepositoryError(topicResult.error)
    if (keywordResult.isErr()) return mapRepositoryError(keywordResult.error)

    const response: GetSearchKeywordResponse = [
      ...userResult.value.map((user) => ({
        type: 'USER' as const,
        id: user.id,
        name: user.name,
        profileImage: user.profileImagePath
          ? this.fileServerService.getFileEndpointUrl(user.profileImagePath)
          : null,
      })),
      ...topicResult.value.map((topic) => ({
        type: 'TOPIC' as const,
        id: topic.id,
        name: topic.name,
        bannerImage: topic.bannerImagePath
          ? this.fileServerService.getFileEndpointUrl(topic.bannerImagePath)
          : null,
      })),
      ...keywordResult.value.map((keyword) => ({
        type: 'QUERY' as const,
        query: keyword,
      })),
    ]

    return ok(response)
  }

  async searchFeedItems(query: {
    search: string
    userId?: string
    limit?: number
    cursor?: string
  }) {
    const result = await this.searchRepository.searchFeedItems(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    const response = {
      items: result.value,
      meta: {
        cursor: {
          next: result.value.at(-1)?.id || null,
          previous: query.cursor || null,
        },
      },
    } satisfies GetSearchFeedItemsResponse

    return ok(response)
  }

  async searchAnnouncements(query: { search: string; limit?: number; cursor?: string }) {
    const result = await this.searchRepository.searchAnnouncements(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    const response: GetSearchAnnouncementResponse = result.value.map((announcement) => ({
      id: announcement.feedItemId,
      title: announcement.title,
      type: announcement.type,
      publishedAt: announcement.feedItem.publishedAt!,
    }))

    return ok(response)
  }

  async searchTopics(query: { search: string; limit?: number; cursor?: string }) {
    const result = await this.searchRepository.searchTopics(query)

    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(
      result.value.map((topic) => ({
        id: topic.id,
        name: topic.name,
        bannerImage: topic.bannerImagePath
          ? this.fileServerService.getFileEndpointUrl(topic.bannerImagePath)
          : null,
        hashtags: topic.hashTags.map(({ hashTag }) => ({
          id: hashTag.id,
          name: hashTag.name,
        })),
      }))
    )
  }

  async searchHashtags(query: { search: string; limit?: number; cursor?: string }) {
    const result = await this.searchRepository.searchHashtags(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value)
  }

  async searchUsers(query: { search: string; limit?: number; cursor?: string }) {
    const users = await this.searchRepository.searchUsers(query)
    if (users.isErr()) return mapRepositoryError(users.error)

    const response: GetSearchUsersResponse = users.value.map((user) => ({
      ...user,
      profileImage: user.profileImagePath
        ? this.fileServerService.getFileEndpointUrl(user.profileImagePath)
        : undefined,
    }))

    return ok(response)
  }
}

export const SearchServicePlugin = new Elysia({
  name: 'SearchService',
})
  .use([SearchRepositoryPlugin, FileServerServicePlugin])
  .decorate(({ searchRepository, fileServerService }) => ({
    searchService: new SearchService(searchRepository, fileServerService),
  }))
