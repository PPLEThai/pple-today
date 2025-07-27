import { t } from 'elysia'

export const ExternalFacebookErrorBody = t.Object({
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

export const ExternalFacebookPageCursor = t.Object({
  paging: t.Object({
    cursors: t.Object({
      before: t.String({ description: 'Cursor for the previous page' }),
      after: t.String({ description: 'Cursor for the next page' }),
    }),
  }),
})

export const ExternalFacebookAccessTokenResponse = t.Object({
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

export const ExternalFacebookInspectAccessTokenResponseBody = t.Object({
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
      target_ids: t.Array(t.Integer(), {
        description: 'List of target IDs for the granular scope',
      }),
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

export const ExternalFacebookInspectAccessTokenResponse = t.Object({
  data: ExternalFacebookInspectAccessTokenResponseBody,
})

export const ExternalFacebookGetProfileImageResponse = t.Object(
  {
    data: t.Object({
      url: t.String({
        description: 'The URL of the profile picture for the Facebook user',
        format: 'uri',
      }),
    }),
  },
  {
    description: 'Response containing the profile picture URL of the Facebook user',
  }
)

export const ExternalFacebookGetPageDetailsResponse = t.Object(
  {
    access_token: t.Optional(
      t.String({
        description: 'The access token for the Facebook page',
      })
    ),
    id: t.String({
      description: 'The ID of the Facebook page',
    }),
    name: t.String({
      description: 'The name of the Facebook page',
    }),
    picture: ExternalFacebookGetProfileImageResponse,
  },
  {
    description: 'Response containing details of a Facebook page',
  }
)

export const ExternalFacebookListUserPageResponse = t.Object(
  {
    data: t.Array(ExternalFacebookGetPageDetailsResponse),
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

export const ExternalFacebookPostMessageHashtag = t.Object({
  id: t.String({ description: 'ID of the hashtag' }),
  name: t.String({ description: 'Name of the hashtag' }),
  offset: t.Number({ description: 'Offset in the message where the hashtag starts' }),
  length: t.Number({ description: 'Length of the hashtag in characters' }),
})

export const ExternalFacebookPostAttachment = t.Object({
  media: t.Object({
    image: t.Object({
      height: t.Number({ description: 'Height of the image' }),
      src: t.String({ description: 'Source URL of the image', format: 'uri' }),
      width: t.Number({ description: 'Width of the image' }),
    }),
  }),
  target: t.Object({
    id: t.String({ description: 'ID of the target' }),
    url: t.String({ description: 'URL of the target', format: 'uri' }),
  }),
  type: t.String({ description: 'Type of the attachment (e.g., photo)' }),
  url: t.String({ description: 'URL of the attachment', format: 'uri' }),
})

export const ExternalFacebookPagePost = t.Object({
  id: t.String({ description: 'ID of the Facebook page post' }),
  message: t.Optional(t.String({ description: 'Content of the Facebook page post' })),
  created_time: t.String({ description: 'Creation time of the post in ISO 8601 format' }),
  updated_time: t.String({ description: 'Last update time of the post in ISO 8601 format' }),
  message_tags: t.Optional(
    t.Array(
      t.Object({
        data: ExternalFacebookPostMessageHashtag,
      }),
      {
        description: 'List of hashtags in the post message',
      }
    )
  ),
  attachments: t.Optional(
    t.Array(ExternalFacebookPostAttachment, {
      description: 'List of attachments in the post',
    })
  ),
})

export const ExternalFacebookGetPagePostsResponse = t.Object(
  {
    data: t.Array(ExternalFacebookPagePost),
    paging: ExternalFacebookPageCursor,
  },
  {
    description: 'Response containing details of a Facebook page post',
  }
)
