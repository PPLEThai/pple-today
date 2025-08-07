import { Static, t } from 'elysia'

export const RequestAccessTokenQuery = t.Object({
  code: t.String({
    description: 'The authorization code received from Facebook after user consent',
    minLength: 1,
  }),
  redirectUri: t.String({
    description: 'The redirect URI used in the OAuth flow',
    format: 'uri',
  }),
})
export type RequestAccessTokenQuery = Static<typeof RequestAccessTokenQuery>

export const RequestAccessTokenResponse = t.Object({
  accessToken: t.String({
    description: 'The access token for the user',
  }),
  tokenType: t.String({
    description: 'The type of the access token',
  }),
  expiresIn: t.Optional(
    t.Number({
      description: 'The number of seconds until the access token expires',
    })
  ),
})
export type RequestAccessTokenResponse = Static<typeof RequestAccessTokenResponse>

export const GetFacebookUserPageListQuery = t.Object({
  facebookToken: t.String({
    description: 'The access token for the Facebook user',
    minLength: 1,
  }),
})
export type GetFacebookUserPageListQuery = Static<typeof GetFacebookUserPageListQuery>

export const GetFacebookUserPageListResponse = t.Array(
  t.Object({
    accessToken: t.String({
      description: 'The access token for the linked Facebook page',
    }),
    id: t.String({
      description: 'The ID of the Facebook page',
    }),
    name: t.String({
      description: 'The name of the Facebook page',
    }),
    profilePictureUrl: t.String({
      description: 'The URL of the profile picture for the Facebook page',
      format: 'uri',
    }),
  }),
  {
    description: 'List of Facebook pages associated with the user',
  }
)
export type GetFacebookUserPageListResponse = Static<typeof GetFacebookUserPageListResponse>

export const GetLinkedFacebookPageResponse = t.Object({
  linkedFacebookPage: t.Nullable(
    t.Object({
      id: t.String({
        description: 'The ID of the linked Facebook page',
      }),
      name: t.String({
        description: 'The name of the linked Facebook page',
      }),
      profilePictureUrl: t.String({
        description: 'The URL of the profile picture for the linked Facebook page',
        format: 'uri',
      }),
    })
  ),
})
export type GetLinkedFacebookPageResponse = Static<typeof GetLinkedFacebookPageResponse>

export const LinkFacebookPageToUserBody = t.Object({
  facebookPageId: t.String({
    description: 'The ID of the Facebook page to link to the user',
  }),
  facebookPageAccessToken: t.String({
    description: 'The access token for the Facebook page',
  }),
})
export type LinkFacebookPageToUserBody = Static<typeof LinkFacebookPageToUserBody>

export const LinkFacebookPageToUserResponse = t.Object({
  message: t.String({
    description: 'Success message indicating the Facebook page was linked successfully',
  }),
})
export type LinkFacebookPageToUserResponse = Static<typeof LinkFacebookPageToUserResponse>

export const UnlinkPageResponse = t.Object({
  message: t.String({
    description: 'Success message indicating the Facebook page was unlinked successfully',
  }),
})
export type UnlinkPageResponse = Static<typeof UnlinkPageResponse>

export const ValidateFacebookWebhookQuery = t.Object({
  'hub.mode': t.String({
    description: 'The mode of the webhook request, should be "subscribe"',
    enum: ['subscribe'],
  }),
  'hub.verify_token': t.String({
    description: 'The verification token to validate the webhook request',
    minLength: 1,
  }),
  'hub.challenge': t.String({
    description: 'The challenge string to respond with for verification',
    minLength: 1,
  }),
})
export type ValidateFacebookWebhookQuery = Static<typeof ValidateFacebookWebhookQuery>

export const ValidateFacebookWebhookResponse = t.String({
  description: 'The challenge string to respond with for verification',
})
export type ValidateFacebookWebhookResponse = Static<typeof ValidateFacebookWebhookResponse>

export const HandleFacebookWebhookHeaders = t.Object({
  'x-hub-signature-256': t.String({
    description: 'The SHA-256 signature header for the Facebook webhook request',
    minLength: 1,
  }),
})
