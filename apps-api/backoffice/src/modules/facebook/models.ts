import {
  FacebookConnectAttemptOutcome,
  FacebookPageLinkedStatus,
} from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { CONNECT_ATTEMPT_ID_PATTERN } from './connect-attempt'

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

export const GetLinkedPageAvailableStatusQuery = t.Object({
  pageIds: t.Array(
    t.String({
      description: 'The IDs of the Facebook pages to check availability for',
      minLength: 1,
    }),
    { minItems: 1 }
  ),
})
export type GetLinkedPageAvailableStatusQuery = Static<typeof GetLinkedPageAvailableStatusQuery>

export const GetLinkedPageAvailableStatusResponse = t.Record(t.String(), t.Boolean())
export type GetLinkedPageAvailableStatusResponse = Static<
  typeof GetLinkedPageAvailableStatusResponse
>

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
      status: t.Enum(FacebookPageLinkedStatus, {
        description: 'The linked status of the Facebook page',
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

export const GetFacebookConfigResponse = t.Object({
  canConnectPage: t.Boolean({
    description:
      'Whether the caller may connect and manage a Facebook page, decided from their SSO AD roles. Clients gate the Facebook page section on this instead of matching roles themselves.',
  }),
})
export type GetFacebookConfigResponse = Static<typeof GetFacebookConfigResponse>

const ConnectAttemptText = (maxLength: number, description: string) =>
  t.Optional(t.String({ maxLength, description }))

export const CreateFacebookConnectAttemptBody = t.Object({
  attemptId: t.String({
    pattern: CONNECT_ATTEMPT_ID_PATTERN,
    description:
      'Client-generated attempt id. Its first 6 characters are the reference code shown to the user',
  }),
  outcome: t.Enum(FacebookConnectAttemptOutcome, {
    description: 'How the attempt ended',
  }),
  startedAt: t.String({ format: 'date-time', description: 'When the user pressed the button' }),
  failedStep: ConnectAttemptText(64, 'The step that ended a FAILED attempt'),
  error: t.Optional(
    t.Object({
      domain: ConnectAttemptText(200, 'Native error domain, e.g. com.facebook.sdk.login'),
      code: ConnectAttemptText(64, 'Native, Graph API or backend error code'),
      message: ConnectAttemptText(1000, 'Error message, with secrets redacted'),
    })
  ),
  context: t.Object({
    platform: t.String({ maxLength: 16, description: 'ios or android' }),
    osVersion: ConnectAttemptText(32, 'OS version'),
    appVersion: ConnectAttemptText(32, 'App version'),
    buildNumber: ConnectAttemptText(32, 'Native build number'),
    deviceModel: ConnectAttemptText(64, 'Device model name'),
    facebookAppInstalled: t.Optional(
      t.Nullable(t.Boolean({ description: 'Whether the Facebook app is installed' }))
    ),
    trackingPermission: ConnectAttemptText(32, 'iOS App Tracking Transparency status'),
  }),
  steps: t.Array(
    t.Object({
      at: t.Integer({ minimum: 0, description: 'Milliseconds since the attempt started' }),
      name: t.String({ maxLength: 64, description: 'Step name, e.g. login_result' }),
      data: t.Optional(t.Record(t.String(), t.Unknown())),
    }),
    { maxItems: 50 }
  ),
})
export type CreateFacebookConnectAttemptBody = Static<typeof CreateFacebookConnectAttemptBody>

export const CreateFacebookConnectAttemptResponse = t.Object({
  referenceCode: t.String({ description: 'The reference code of the stored attempt' }),
})
export type CreateFacebookConnectAttemptResponse = Static<
  typeof CreateFacebookConnectAttemptResponse
>
