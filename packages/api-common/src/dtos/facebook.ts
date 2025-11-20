import { FacebookPageLinkedStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const ErrorBody = t.Object({
  error: t.Object({
    message: t.String({ description: 'Message describing the error' }),
    type: t.String({ description: 'Type of the error' }),
    code: t.Number({ description: 'Error code' }),
    fbtrace_id: t.String({ description: 'Facebook trace ID' }),
    error_subcode: t.Optional(t.Number({ description: 'Error subcode' })),
    error_user_title: t.Optional(t.String({ description: 'User-facing error title' })),
    error_user_msg: t.Optional(t.String({ description: 'User-facing error message' })),
  }),
})
export type ErrorBody = Static<typeof ErrorBody>

export const PageCursor = t.Object({
  cursors: t.Object({
    before: t.String({ description: 'Cursor for the previous page' }),
    after: t.String({ description: 'Cursor for the next page' }),
  }),
})
export type PageCursor = Static<typeof PageCursor>

export const AccessTokenResponse = t.Object({
  access_token: t.String({
    description: 'The access token for the Facebook page',
  }),
  token_type: t.String({
    description: 'The type of the access token',
  }),
  expires_in: t.Optional(
    t.Number({
      description: 'The number of seconds until the access token expires',
    })
  ),
})
export type AccessTokenResponse = Static<typeof AccessTokenResponse>

export const InspectAccessTokenResponseBody = t.Object({
  app_id: t.String({
    description: 'The ID of the Facebook app',
  }),
  type: t.String({
    description: 'The type of the access token (e.g., USER)',
  }),
  application: t.String({
    description: 'The name of the Facebook application',
  }),
  expires_at: t.Number({
    description: 'The expiration time of the access token in Unix timestamp format',
  }),
  scopes: t.Array(t.String(), {
    description: 'List of permissions granted by the access token',
  }),
  granular_scopes: t.Array(
    t.Object({
      scope: t.String({
        description: 'The specific scope granted by the access token',
      }),
      target_ids: t.Optional(
        t.Array(t.Integer(), {
          description: 'List of target IDs for the granular scope',
        })
      ),
    }),
    {
      description: 'List of granular scopes granted by the access token',
    }
  ),
  user_id: t.String({
    description: 'The ID of the user associated with the access token',
  }),
  is_valid: t.Boolean({
    description: 'Indicates whether the access token is valid',
  }),
  issued_at: t.Optional(
    t.Number({
      description: 'The time when the access token was issued in Unix timestamp format',
    })
  ),
  metadata: t.Optional(
    t.Object({
      sso: t.String({
        description: 'Single Sign-On information, if applicable',
      }),
    })
  ),
})
export type InspectAccessTokenResponseBody = Static<typeof InspectAccessTokenResponseBody>

export const InspectAccessTokenResponse = t.Object({
  data: InspectAccessTokenResponseBody,
})
export type InspectAccessTokenResponse = Static<typeof InspectAccessTokenResponse>

export const GetProfileImageResponse = t.Object(
  {
    data: t.Object({
      url: t.String({
        description: 'The URL of the profile picture for the Facebook user',
        format: 'uri',
      }),
      cache_key: t.String({
        description: 'Cache key for the profile picture, used for caching purposes',
      }),
      height: t.Optional(t.Number({ description: 'Height of the profile picture' })),
      width: t.Optional(t.Number({ description: 'Width of the profile picture' })),
      is_silhouette: t.Optional(
        t.Boolean({
          description: 'Indicates whether the profile picture is a silhouette',
        })
      ),
    }),
  },
  {
    description: 'Response containing the profile picture URL of the Facebook user',
  }
)
export type GetProfileImageResponse = Static<typeof GetProfileImageResponse>

export const GetPageDetailsResponse = t.Object(
  {
    access_token: t.String({
      description: 'The access token for the Facebook page',
    }),
    id: t.String({
      description: 'The ID of the Facebook page',
    }),
    name: t.String({
      description: 'The name of the Facebook page',
    }),
    picture: GetProfileImageResponse,
  },
  {
    description: 'Response containing details of a Facebook page',
  }
)
export type GetPageDetailsResponse = Static<typeof GetPageDetailsResponse>

export const ListUserPageResponse = t.Object(
  {
    data: t.Array(GetPageDetailsResponse),
    paging: t.Optional(
      t.Object({
        cursors: t.Object({
          before: t.String({ description: 'Cursor for the previous page' }),
          after: t.String({ description: 'Cursor for the next page' }),
        }),
      })
    ),
  },
  {
    description: 'Response containing the list of Facebook pages for the user',
  }
)
export type ListUserPageResponse = Static<typeof ListUserPageResponse>

export const PostMessageHashtag = t.Object({
  id: t.String({ description: 'ID of the hashtag' }),
  name: t.String({ description: 'Name of the hashtag' }),
  offset: t.Number({ description: 'Offset in the message where the hashtag starts' }),
  length: t.Number({ description: 'Length of the hashtag in characters' }),
})
export type PostMessageHashtag = Static<typeof PostMessageHashtag>

export const PostAttachment = t.Object({
  description: t.Optional(t.String({ description: 'Description of the attachment' })),
  media: t.Object({
    image: t.Object({
      height: t.Number({ description: 'Height of the image' }),
      src: t.String({ description: 'Source URL of the image', format: 'uri' }),
      width: t.Number({ description: 'Width of the image' }),
    }),
    source: t.Optional(
      t.String({ description: 'Source URL of the media, if applicable', format: 'uri' })
    ),
  }),
  target: t.Object({
    id: t.String({ description: 'ID of the target' }),
    url: t.String({ description: 'URL of the target', format: 'uri' }),
  }),
  type: t.String({ description: 'Type of the attachment (e.g., photo)' }),
  url: t.String({ description: 'URL of the attachment', format: 'uri' }),
})
export type PostAttachment = Static<typeof PostAttachment>

export const PostAttachmentWithSubAttachment = t.Composite([
  PostAttachment,
  t.Object({
    subattachments: t.Optional(
      t.Object({
        data: t.Array(PostAttachment, {
          description: 'List of sub-attachments in the post',
        }),
      })
    ),
  }),
])
export type PostAttachmentWithSubAttachment = Static<typeof PostAttachmentWithSubAttachment>

export const PagePost = t.Object({
  id: t.String({ description: 'ID of the Facebook page post' }),
  message: t.Optional(t.String({ description: 'Content of the Facebook page post' })),
  created_time: t.String({ description: 'Creation time of the post in ISO 8601 format' }),
  updated_time: t.String({ description: 'Last update time of the post in ISO 8601 format' }),
  parent_id: t.Optional(
    t.String({ description: 'ID of the parent post, if this is a comment or reply' })
  ),
  message_tags: t.Optional(
    t.Array(PostMessageHashtag, {
      description: 'List of hashtags in the post message',
    })
  ),
  attachments: t.Optional(
    t.Object({
      data: t.Array(PostAttachmentWithSubAttachment, {
        description: 'List of attachments in the post',
      }),
    })
  ),
})
export type PagePost = Static<typeof PagePost>

export const GetPagePostsResponse = t.Object(
  {
    data: t.Array(PagePost),
    paging: t.Optional(PageCursor),
  },
  {
    description: 'Response containing details of a Facebook page post',
  }
)
export type GetPagePostsResponse = Static<typeof GetPagePostsResponse>

export const WebhookChangesVerb = {
  ADD: 'add',
  EDIT: 'edited',
  REMOVE: 'remove',
} as const
export type WebhookChangesVerb = (typeof WebhookChangesVerb)[keyof typeof WebhookChangesVerb]

export const WebhookFeedType = {
  STATUS: 'status',
  VIDEO: 'video',
  COMMENT: 'comment',
  REACTION: 'reaction',
  SHARE: 'share',
  PHOTO: 'photo',
} as const
export type WebhookFeedType = (typeof WebhookFeedType)[keyof typeof WebhookFeedType]

export const WebhookBaseChangesFeedValue = t.Object({
  from: t.Object({
    id: t.String({ description: 'ID of the user who posted' }),
    name: t.String({ description: 'Name of the user who posted' }),
  }),
  post_id: t.String({ description: 'ID of the post' }),
  created_time: t.Number({ description: 'Creation time of the post in seconds since epoch' }),
  verb: t.Enum(WebhookChangesVerb),
  published: t.Union([t.Literal(1), t.Literal(0)]),
})

export const WebhookFeedChanges = t.Union([
  t.Composite([
    WebhookBaseChangesFeedValue,
    t.Object({
      item: t.Literal(WebhookFeedType.PHOTO),
      link: t.Optional(t.String({ description: 'Link to the photo', format: 'uri' })),
      message: t.Optional(t.String({ description: 'Content of the post' })),
    }),
  ]),
  t.Composite([
    WebhookBaseChangesFeedValue,
    t.Object({
      item: t.Literal(WebhookFeedType.STATUS),
      photos: t.Optional(t.Array(t.String({ description: 'Array of photo URLs', format: 'uri' }))),
      message: t.Optional(t.String({ description: 'Content of the post' })),
    }),
  ]),
  t.Composite([
    WebhookBaseChangesFeedValue,
    t.Object({
      item: t.Literal(WebhookFeedType.VIDEO),
      video_id: t.Optional(t.String({ description: 'ID of the video' })),
      link: t.Optional(t.String({ description: 'Link to the video', format: 'uri' })),
      message: t.Optional(t.String({ description: 'Content of the post' })),
    }),
  ]),
  t.Composite([
    WebhookBaseChangesFeedValue,
    t.Object({
      item: t.Literal(WebhookFeedType.COMMENT),
      comment_id: t.String({ description: 'ID of the comment' }),
      message: t.Optional(t.String({ description: 'Content of the comment' })),
      parent_id: t.Optional(
        t.String({ description: 'ID of the parent post or comment, if applicable' })
      ),
      post: t.Object({
        status_type: t.String({
          description: 'Type of the post (e.g., status, photo, video)',
        }),
        is_published: t.Boolean({
          description: 'Indicates whether the post is published',
        }),
        updated_time: t.String({
          description: 'Last update time of the post in ISO 8601 format',
          format: 'date-time',
        }),
        permalink_url: t.String({
          description: 'Permanent link to the post',
        }),
        promotion_status: t.String({
          description: 'Promotion status of the post (e.g., active, inactive)',
        }),
        id: t.String({
          description: 'ID of the post',
        }),
      }),
    }),
  ]),
  t.Composite([
    WebhookBaseChangesFeedValue,
    t.Object({
      item: t.Literal(WebhookFeedType.REACTION),
      reaction_type: t.String({ description: 'Type of the reaction (e.g., like, love, wow)' }),
      parent_id: t.String({ description: 'ID of the parent post or comment, if applicable' }),
    }),
  ]),
  t.Composite([
    WebhookBaseChangesFeedValue,
    t.Object({
      item: t.Literal(WebhookFeedType.SHARE),
      share_id: t.String({ description: 'ID of the share' }),
      link: t.String({ description: 'Link to the shared content' }),
      message: t.Optional(t.String({ description: 'Content of the post' })),
    }),
  ]),
])
export type WebhookFeedChanges = Static<typeof WebhookFeedChanges>

export const FacebookPage = t.Object({
  id: t.String({ description: 'The ID of the facebook page' }),
  name: t.String({ description: 'The name of the facebook page' }),
  numberOfFollowers: t.Optional(
    t.Number({ description: 'The number of followers of the facebook page' })
  ),
  linkedStatus: t.Enum(FacebookPageLinkedStatus, {
    description: 'The status of the facebook page',
  }),
})
export type FacebookPage = Static<typeof FacebookPage>

export const DetailedFacebookPage = t.Composite([
  FacebookPage,
  t.Object({
    createdAt: t.Date({ description: 'The creation date of the facebook page entry' }),
    user: t.Optional(
      t.Object({
        id: t.String({ description: 'The ID of the user who linked the facebook page' }),
        name: t.String({ description: 'The name of the user who linked the facebook page' }),
        profileImagePath: t.Nullable(
          t.String({
            description: 'The profile image URL of the user who linked the facebook page',
          })
        ),
      })
    ),
  }),
])
export type DetailedFacebookPage = Static<typeof DetailedFacebookPage>
