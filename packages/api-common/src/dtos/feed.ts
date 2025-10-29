import {
  AnnouncementType,
  FeedItemReactionType,
  FeedItemType,
  PollType,
  PostAttachmentType,
} from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { Author } from './user'

export const Commenter = t.Object({
  id: t.String({ description: 'The ID of the user' }),
  name: t.String({ description: 'The name of the user' }),
  profileImage: t.Optional(t.String({ description: 'The profile image URL of the user' })),
})
export type Commenter = Static<typeof Commenter>

export const FeedItemComment = t.Object({
  id: t.String({ description: 'The ID of the comment' }),
  content: t.String({ description: 'The content of the comment' }),
  createdAt: t.Date({ description: 'The creation date of the comment' }),
  isPrivate: t.Boolean({ description: 'Whether the comment is private' }),
  author: Commenter,
})
export type FeedItemComment = Static<typeof FeedItemComment>

export const FeedItemReaction = t.Object({
  type: t.Enum(FeedItemReactionType, {
    description: 'The type of reaction, e.g., UP_VOTE or DOWN_VOTE',
  }),
  count: t.Number({ description: 'The count of reactions of this type' }),
})
export type FeedItemReaction = Static<typeof FeedItemReaction>

export const FeedItemBaseContent = t.Object({
  id: t.String({ description: 'The ID of the feed item' }),
  publishedAt: t.Date({ description: 'The published date of the feed item' }),
  commentCount: t.Number({ description: 'The number of comments on the feed item' }),
  userReaction: t.Nullable(t.Enum(FeedItemReactionType)),
  reactions: t.Array(FeedItemReaction),
  author: Author,
})
export type FeedItemBaseContent = Static<typeof FeedItemBaseContent>

export const FeedItemPostContent = t.Object({
  type: t.Literal(FeedItemType.POST, {
    description: 'The type of the feed item, in this case, a post',
  }),
  post: t.Object({
    content: t.String({ description: 'The content of the post' }),
    hashTags: t.Array(
      t.Object({
        id: t.String({ description: 'The ID of the hashtag' }),
        name: t.String({ description: 'The name of the hashtag' }),
      })
    ),
    attachments: t.Optional(
      t.Array(
        t.Object({
          id: t.String({ description: 'The ID of the attachment' }),
          url: t.String({ description: 'The URL of the attachment' }),
          thumbnailUrl: t.Optional(
            t.String({ description: 'The thumbnail URL of the attachment' })
          ),
          width: t.Optional(t.Number({ description: 'The width of the attachment' })),
          height: t.Optional(t.Number({ description: 'The height of the attachment' })),
          type: t.Enum(PostAttachmentType, {
            description: 'The type of the attachment, e.g., image, video',
          }),
        })
      )
    ),
  }),
})
export type FeedItemPostContent = Static<typeof FeedItemPostContent>

export const FeedItemPost = t.Composite([FeedItemBaseContent, FeedItemPostContent])
export type FeedItemPost = Static<typeof FeedItemPost>

export const FeedItemPollContent = t.Object({
  type: t.Literal(FeedItemType.POLL, {
    description: 'The type of the feed item, in this case, a poll',
  }),
  poll: t.Object({
    title: t.String({ description: 'The title of the poll' }),
    endAt: t.Date({ description: 'The end date of the poll' }),
    type: t.Enum(PollType, {
      description: 'The type of the poll, e.g., single-choice or multiple-choice',
    }),
    options: t.Array(
      t.Object({
        id: t.String({ description: 'The ID of the poll option' }),
        title: t.String({ description: 'The title of the poll option' }),
        votes: t.Number({ description: 'The number of votes for this option' }),
        isSelected: t.Boolean({ description: 'Whether the option is selected by the user' }),
      })
    ),
    totalVotes: t.Number({ description: 'The total number of votes for the poll' }),
  }),
})
export type FeedItemPollContent = Static<typeof FeedItemPollContent>

export const FeedItemPoll = t.Composite([FeedItemBaseContent, FeedItemPollContent])
export type FeedItemPoll = Static<typeof FeedItemPoll>

export const FeedItemAnnouncementContent = t.Object({
  type: t.Literal(FeedItemType.ANNOUNCEMENT, {
    description: 'The type of the feed item, in this case, an announcement',
  }),
  announcement: t.Object({
    title: t.String({ description: 'The title of the announcement' }),
    type: t.Enum(AnnouncementType, { description: 'The type of announcement' }),
    content: t.String({ description: 'The content of the announcement' }),
    attachments: t.Optional(t.Array(t.String({ description: 'The URL of the attachment' }))),
  }),
})
export type FeedItemAnnouncementContent = Static<typeof FeedItemAnnouncementContent>

export const FeedItemAnnouncement = t.Composite([FeedItemBaseContent, FeedItemAnnouncementContent])
export type FeedItemAnnouncement = Static<typeof FeedItemAnnouncement>

export const FeedItem = t.Union([FeedItemPost, FeedItemPoll, FeedItemAnnouncement])
export type FeedItem = Static<typeof FeedItem>
