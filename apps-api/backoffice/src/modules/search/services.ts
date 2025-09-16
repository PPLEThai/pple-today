import { FileService } from '@pple-today/api-common/services'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  GetSearchAnnouncementResponse,
  GetSearchKeywordResponse,
  GetSearchPostsResponse,
  GetSearchUsersResponse,
} from './models'
import { SearchRepository, SearchRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../plugins/file'

export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly fileService: FileService
  ) {}

  async searchKeywords(query: { search: string }) {
    const [userResult, topicResult] = await Promise.all([
      this.searchRepository.searchUsers({
        search: query.search,
        limit: 3,
      }),
      this.searchRepository.searchTopics({
        search: query.search,
        limit: 3,
      }),
    ])

    if (userResult.isErr()) return mapRepositoryError(userResult.error)
    if (topicResult.isErr()) return mapRepositoryError(topicResult.error)

    const response: GetSearchKeywordResponse = [
      ...userResult.value.map((user) => ({
        type: 'USER' as const,
        id: user.id,
        name: user.name,
        profileImageUrl: user.profileImage
          ? this.fileService.getPublicFileUrl(user.profileImage)
          : undefined,
      })),
      ...topicResult.value.map((topic) => ({
        type: 'TOPIC' as const,
        id: topic.id,
        name: topic.name,
      })),
    ]

    return ok(response)
  }

  async searchPosts(query: { search: string; userId?: string; limit?: number; cursor?: string }) {
    const result = await this.searchRepository.searchPosts(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    const response: GetSearchPostsResponse = result.value.map((post) => ({
      author: {
        id: post.feedItem.author.id,
        name: post.feedItem.author.name,
        profileImage: post.feedItem.author.profileImage
          ? this.fileService.getPublicFileUrl(post.feedItem.author.profileImage)
          : undefined,
      },
      commentCount: post.feedItem.numberOfComments,
      createdAt: post.feedItem.createdAt,
      id: post.feedItemId,
      post: {
        content: post.content ?? '',
        attachments: post.attachments.map((image) => ({
          id: image.id,
          type: image.type,
          width: image.width ?? undefined,
          height: image.height ?? undefined,
          thumbnailUrl: image.thumbnailPath
            ? this.fileService.getPublicFileUrl(image.thumbnailPath)
            : undefined,
          url: this.fileService.getPublicFileUrl(image.url),
        })),
        hashTags: post.hashTags.map((h) => ({
          id: h.hashTag.id,
          name: h.hashTag.name,
        })),
      },
      reactions: post.feedItem.reactionCounts.map((r) => ({
        type: r.type,
        count: r.count,
      })),
      type: 'POST' as const,
      userReaction: post.feedItem.reactions[0]?.type,
    }))

    return ok(response)
  }

  async searchAnnouncements(query: { search: string; limit?: number; cursor?: string }) {
    const result = await this.searchRepository.searchAnnouncements(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    const response: GetSearchAnnouncementResponse = result.value.map((announcement) => ({
      id: announcement.feedItemId,
      title: announcement.title,
      type: announcement.type,
      topics: announcement.topics.map((t) => ({
        id: t.topic.id,
        name: t.topic.name,
      })),
    }))

    return ok(response)
  }

  async searchTopics(query: { search: string; limit?: number; cursor?: string }) {
    const result = await this.searchRepository.searchTopics(query)

    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value)
  }

  async searchHashtags(query: { search: string; limit?: number; cursor?: string }) {
    if (query.search[0] !== '#') {
      return ok([])
    }

    const result = await this.searchRepository.searchHashtags(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value)
  }

  async searchUsers(query: { search: string; limit?: number; cursor?: string }) {
    const users = await this.searchRepository.searchUsers(query)
    if (users.isErr()) return mapRepositoryError(users.error)

    const response: GetSearchUsersResponse = users.value.map((user) => ({
      ...user,
      profileImage: user.profileImage
        ? this.fileService.getPublicFileUrl(user.profileImage)
        : undefined,
    }))

    return ok(response)
  }
}

export const SearchServicePlugin = new Elysia({
  name: 'SearchService',
})
  .use([SearchRepositoryPlugin, FileServicePlugin])
  .decorate(({ searchRepository, fileService }) => ({
    searchService: new SearchService(searchRepository, fileService),
  }))
