import { Static, t } from 'elysia'

export const FeedItemCommentIdParams = t.Object({
  id: t.String({ description: 'The ID of the feed item comment' }),
})
export type FeedItemCommentIdParams = Static<typeof FeedItemCommentIdParams>

// PATCH /admin/feeds/comments/{id}
export const UpdateFeedItemCommentPrivacyParams = FeedItemCommentIdParams
export type UpdateFeedItemCommentPrivacyParams = Static<typeof UpdateFeedItemCommentPrivacyParams>

export const UpdateFeedItemCommentPrivacyBody = t.Object({
  isPrivate: t.Boolean({ description: 'Whether the comment is private' }),
})
export type UpdateFeedItemCommentPrivacyBody = Static<typeof UpdateFeedItemCommentPrivacyBody>

export const UpdateFeedItemCommentPrivacyResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdateFeedItemCommentPrivacyResponse = Static<
  typeof UpdateFeedItemCommentPrivacyResponse
>
