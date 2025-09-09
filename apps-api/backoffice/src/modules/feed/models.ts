import { FeedItem, FeedItemComment, ListQuery, PaginationQuery } from '@pple-today/api-common/dtos'
import { FeedItemReactionType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const GetFeedContentParams = t.Object({
  id: t.String({ description: 'The ID of the feed item' }),
})
export type GetFeedContentParams = Static<typeof GetFeedContentParams>

export const GetFeedContentResponse = FeedItem
export type GetFeedContentResponse = Static<typeof GetFeedContentResponse>

export const GetFeedCommentParams = t.Object({
  id: t.String({ description: 'The ID of the feed' }),
})
export const GetFeedCommentQuery = t.Object({
  page: t.Optional(t.Number({ description: 'The page number for pagination', default: 1 })),
  limit: t.Optional(t.Number({ description: 'The number of comments per page', default: 10 })),
})
export const GetFeedCommentResponse = t.Array(FeedItemComment)

export type GetFeedCommentParams = Static<typeof GetFeedCommentParams>
export type GetFeedCommentQuery = Static<typeof GetFeedCommentQuery>
export type GetFeedCommentResponse = Static<typeof GetFeedCommentResponse>

export const CreateFeedReactionParams = t.Object({
  id: t.String({ description: 'The ID of the feed' }),
})
export const CreateFeedReactionBody = t.Union([
  t.Object({
    type: t.Literal(FeedItemReactionType.UP_VOTE),
  }),
  t.Object({
    type: t.Literal(FeedItemReactionType.DOWN_VOTE),
    comment: t.Optional(t.String({ description: 'Optional comment for the reaction' })),
  }),
])
export const CreateFeedReactionResponse = t.Object({
  feedItemId: t.String({ description: 'The ID of the feed item' }),
  userId: t.String({ description: 'The ID of the user who reacted' }),
  type: t.Enum(FeedItemReactionType, { description: 'The type of reaction' }),
  comment: t.Nullable(FeedItemComment),
})

export type CreateFeedReactionParams = Static<typeof CreateFeedReactionParams>
export type CreateFeedReactionBody = Static<typeof CreateFeedReactionBody>
export type CreateFeedReactionResponse = Static<typeof CreateFeedReactionResponse>

export const DeleteFeedReactionParams = t.Object({
  id: t.String({ description: 'The ID of the feed' }),
})
export const DeleteFeedReactionResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type DeleteFeedReactionParams = Static<typeof DeleteFeedReactionParams>
export type DeleteFeedReactionResponse = Static<typeof DeleteFeedReactionResponse>

export const CreateFeedCommentParams = t.Object({
  id: t.String({ description: 'The ID of the feed' }),
})
export const CreateFeedCommentBody = t.Object({
  content: t.String({ description: 'The content of the comment' }),
})
export const CreateFeedCommentResponse = FeedItemComment

export type CreateFeedCommentParams = Static<typeof CreateFeedCommentParams>
export type CreateFeedCommentBody = Static<typeof CreateFeedCommentBody>
export type CreateFeedCommentResponse = Static<typeof CreateFeedCommentResponse>

export const UpdateFeedCommentParams = t.Object({
  id: t.String({ description: 'The ID of the feed' }),
  commentId: t.String({ description: 'The ID of the comment' }),
})
export const UpdateFeedCommentBody = t.Object({
  content: t.String({ description: 'The updated content of the comment' }),
})
export const UpdateFeedCommentResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type UpdateFeedCommentParams = Static<typeof UpdateFeedCommentParams>
export type UpdateFeedCommentBody = Static<typeof UpdateFeedCommentBody>
export type UpdateFeedCommentResponse = Static<typeof UpdateFeedCommentResponse>

export const DeleteFeedCommentParams = t.Object({
  id: t.String({ description: 'The ID of the feed' }),
  commentId: t.String({ description: 'The ID of the comment' }),
})
export const DeleteFeedCommentResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type DeleteFeedCommentParams = Static<typeof DeleteFeedCommentParams>
export type DeleteFeedCommentResponse = Static<typeof DeleteFeedCommentResponse>

export const GetMyFeedQuery = PaginationQuery
export type GetMyFeedQuery = Static<typeof GetMyFeedQuery>

export const GetMyFeedResponse = t.Array(FeedItem)
export type GetMyFeedResponse = Static<typeof GetMyFeedResponse>

export const GetTopicFeedQuery = ListQuery(
  t.Object({
    topicId: t.String({
      description: 'The ID of the topic to fetch feed items for',
    }),
  })
)
export type GetTopicFeedQuery = Static<typeof GetTopicFeedQuery>

export const GetTopicFeedResponse = t.Array(FeedItem)
export type GetTopicFeedResponse = Static<typeof GetTopicFeedResponse>

export const GetHashTagFeedQuery = ListQuery(
  t.Object({
    hashTagId: t.String({
      description: 'The hashtag to fetch feed items for',
    }),
  })
)
export type GetHashTagFeedQuery = Static<typeof GetHashTagFeedQuery>

export const GetHashTagFeedResponse = t.Array(FeedItem)
export type GetHashTagFeedResponse = Static<typeof GetHashTagFeedResponse>

export const GetFeedItemsByUserIdParams = t.Object({
  id: t.String({ description: 'The ID of the user whose feed items are to be fetched' }),
})
export type GetFeedItemsByUserIdParams = Static<typeof GetFeedItemsByUserIdParams>

export const GetFeedItemsByUserIdQuery = PaginationQuery
export type GetFeedItemsByUserIdQuery = Static<typeof GetFeedItemsByUserIdQuery>

export const GetFeedItemsByUserIdResponse = t.Array(FeedItem)
export type GetFeedItemsByUserIdResponse = Static<typeof GetFeedItemsByUserIdResponse>
