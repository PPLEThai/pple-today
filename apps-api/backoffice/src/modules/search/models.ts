import {
  Announcement,
  Author,
  FeedItem,
  SearchKeyword,
  SearchQuery,
  Topic,
} from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const GetSearchKeywordQuery = t.Pick(SearchQuery, ['search'])
export type GetSearchKeywordQuery = Static<typeof GetSearchKeywordQuery>

export const GetSearchKeywordResponse = t.Array(SearchKeyword)
export type GetSearchKeywordResponse = Static<typeof GetSearchKeywordResponse>

export const GetSearchFeedItemsQuery = SearchQuery
export type GetSearchFeedItemsQuery = Static<typeof GetSearchFeedItemsQuery>

export const GetSearchFeedItemsResponse = t.Array(FeedItem)
export type GetSearchFeedItemsResponse = Static<typeof GetSearchFeedItemsResponse>

export const GetSearchUsersQuery = SearchQuery
export type GetSearchUsersQuery = Static<typeof GetSearchUsersQuery>

export const GetSearchUsersResponse = t.Array(t.Pick(Author, ['id', 'name', 'profileImage']))
export type GetSearchUsersResponse = Static<typeof GetSearchUsersResponse>

export const GetSearchTopicsQuery = SearchQuery
export type GetSearchTopicsQuery = Static<typeof GetSearchTopicsQuery>

export const GetSearchTopicsResponse = t.Array(t.Pick(Topic, ['id', 'name']))
export type GetSearchTopicsResponse = Static<typeof GetSearchTopicsResponse>

export const GetSearchAnnouncementQuery = SearchQuery
export type GetSearchAnnouncementQuery = Static<typeof GetSearchAnnouncementQuery>

export const GetSearchAnnouncementResponse = t.Array(
  t.Pick(Announcement, ['id', 'title', 'type', 'topics'])
)
export type GetSearchAnnouncementResponse = Static<typeof GetSearchAnnouncementResponse>

export const GetSearchHashtagQuery = SearchQuery
export type GetSearchHashtagQuery = Static<typeof GetSearchHashtagQuery>

export const GetSearchHashtagResponse = t.Array(
  t.Object({
    id: t.String(),
    name: t.String(),
  })
)
export type GetSearchHashtagResponse = Static<typeof GetSearchHashtagResponse>
