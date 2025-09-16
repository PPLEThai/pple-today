import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  GetSearchAnnouncementQuery,
  GetSearchAnnouncementResponse,
  GetSearchHashtagQuery,
  GetSearchHashtagResponse,
  GetSearchKeywordQuery,
  GetSearchKeywordResponse,
  GetSearchPostsQuery,
  GetSearchPostsResponse,
  GetSearchTopicsQuery,
  GetSearchTopicsResponse,
  GetSearchUsersQuery,
  GetSearchUsersResponse,
} from './models'
import { SearchServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const SearchController = new Elysia({
  prefix: '/search',
  tags: ['Search'],
})
  .use([AuthGuardPlugin, SearchServicePlugin])
  .get(
    '/keyword',
    async ({ query, status, searchService }) => {
      const result = await searchService.searchKeywords(query)

      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      query: GetSearchKeywordQuery,
      response: {
        200: GetSearchKeywordResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get search keywords',
        description: 'Get search keywords by search query',
      },
    }
  )
  .group('/details', (app) =>
    app
      .get(
        '/posts',
        async ({ query, status, user, searchService }) => {
          const result = await searchService.searchPosts({ ...query, userId: user?.id })

          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, result.value)
        },
        {
          fetchLocalUser: true,
          detail: {
            summary: 'Search posts',
            description: 'Search posts by search query',
          },
          query: GetSearchPostsQuery,
          response: {
            200: GetSearchPostsResponse,
            ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
          },
        }
      )
      .get(
        '/announcements',
        async ({ query, status, searchService }) => {
          const result = await searchService.searchAnnouncements(query)
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, result.value)
        },
        {
          detail: {
            summary: 'Search announcements',
            description: 'Search announcements by search query',
          },
          query: GetSearchAnnouncementQuery,
          response: {
            200: GetSearchAnnouncementResponse,
            ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
          },
        }
      )
      .get(
        '/topics',
        async ({ query, status, searchService }) => {
          const result = await searchService.searchTopics(query)
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, result.value)
        },
        {
          detail: {
            summary: 'Search topics',
            description: 'Search topics by search query',
          },
          query: GetSearchTopicsQuery,
          response: {
            200: GetSearchTopicsResponse,
            ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
          },
        }
      )
      .get(
        '/hashtags',
        async ({ query, status, searchService }) => {
          const result = await searchService.searchHashtags(query)
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, result.value)
        },
        {
          detail: {
            summary: 'Search hashtags',
            description: 'Search hashtags by search query',
          },
          query: GetSearchHashtagQuery,
          response: {
            200: GetSearchHashtagResponse,
            ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
          },
        }
      )
      .get(
        '/users',
        async ({ query, status, searchService }) => {
          const result = await searchService.searchUsers(query)
          if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

          return status(200, result.value)
        },
        {
          detail: {
            summary: 'Search users',
            description: 'Search users by search query',
          },
          query: GetSearchUsersQuery,
          response: {
            200: GetSearchUsersResponse,
            ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
          },
        }
      )
  )
