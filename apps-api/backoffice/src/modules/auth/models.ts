import { UserStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const RegisterUserResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export const GetAuthMeHeaders = t.Object({
  authorization: t.String({
    description: 'Bearer token for authentication',
  }),
})

export const GetAuthMeResponse = t.Object({
  id: t.String({ description: 'User ID' }),
  name: t.Optional(t.String({ description: 'User name' })),
  address: t.Optional(
    t.Object({
      district: t.String({ description: 'User district' }),
      subDistrict: t.String({ description: 'User sub-district' }),
      province: t.String({ description: 'User province' }),
    })
  ),
  status: t.Enum(UserStatus, { description: 'User status' }),
  onBoardingCompleted: t.Boolean({ description: 'Whether the user has completed onboarding' }),
  profileImage: t.Optional(t.String({ description: 'User profile image URL' })),
  roles: t.Array(t.String({ description: 'User role' })),
})

export type GetAuthMeHeaders = Static<typeof GetAuthMeHeaders>
export type GetAuthMeResponse = Static<typeof GetAuthMeResponse>

export const CreateMiniAppTokenParams = t.Object({
  slug: t.String({ description: 'The slug of the mini app' }),
})
export type CreateMiniAppTokenParams = Static<typeof CreateMiniAppTokenParams>

export const CreateMiniAppTokenQuery = t.Object({
  path: t.Optional(t.String({ description: 'The path within the mini app to navigate to' })),
  // Set by the client after the user confirms the "your role is not listed for
  // this app" prompt. Waives the Live role check for this exchange only; every
  // other access rule (tier, ownership, invitation) still applies, as does the
  // mini app's own authorisation.
  acknowledgeRoleMismatch: t.Optional(
    t.Boolean({
      description: 'Open a Live app the active role is not listed for, at the user’s request',
    })
  ),
})
export type CreateMiniAppTokenQuery = Static<typeof CreateMiniAppTokenQuery>

export const MiniAppSession = t.Object({
  accessToken: t.String({ description: 'Access token issued for the mini app’s client' }),
  idToken: t.String({ description: 'ID token issued for the mini app’s client' }),
  tokenType: t.String({ description: 'Token type, always Bearer' }),
  expiresIn: t.Number({ description: 'Seconds until the access token expires' }),
})
export type MiniAppSession = Static<typeof MiniAppSession>

const MiniAppIdentity = {
  appName: t.String({ description: 'The name of the mini app' }),
  slug: t.String({ description: 'The slug of the mini app' }),
  clientId: t.String({ description: 'The OIDC client id of the mini app' }),
  baseUrl: t.String({ description: 'The mini app’s registered URL, without any token' }),
}

export const CreateMiniAppTokenResponse = t.Object({
  url: t.String({
    description:
      'The URL to access the mini app with the generated token. Carries the session in its query string for SDKs that predate the session bridge.',
  }),
  ...MiniAppIdentity,
  session: MiniAppSession,
})
export type CreateMiniAppTokenResponse = Static<typeof CreateMiniAppTokenResponse>

export const CreateMiniAppPageTokenParams = t.Object({
  clientId: t.String({ description: 'The OIDC client id the page says it belongs to' }),
})
export type CreateMiniAppPageTokenParams = Static<typeof CreateMiniAppPageTokenParams>

export const CreateMiniAppPageTokenQuery = t.Object({
  pageUrl: t.String({
    description:
      'The URL of the page asking, as the host WebView reports it. The app must be registered at this origin.',
  }),
  acknowledgeRoleMismatch: t.Optional(
    t.Boolean({
      description: 'Open a Live app the active role is not listed for, at the user’s request',
    })
  ),
})
export type CreateMiniAppPageTokenQuery = Static<typeof CreateMiniAppPageTokenQuery>

export const CreateMiniAppPageTokenResponse = t.Object({
  ...MiniAppIdentity,
  session: t.Nullable(MiniAppSession, {
    description: 'Null when the mini app does not require authentication',
  }),
})
export type CreateMiniAppPageTokenResponse = Static<typeof CreateMiniAppPageTokenResponse>

export const GenerateMiniAppTokenResponse = t.Object({
  access_token: t.String({ description: 'An access_token as JWT or opaque token' }),
  expires_in: t.Number({
    description: 'Number of second until the expiration of the access_token',
  }),
  id_token: t.String({ description: 'An id_token of the authorized user' }),
  token_type: t.Literal('Bearer', {
    description: 'Type of the access_token. Value is always Bearer',
  }),
})
export type GenerateMiniAppTokenResponse = Static<typeof GenerateMiniAppTokenResponse>

export const GenerateMiniAppTokenErrorResponse = t.Object({
  error: t.String({ description: 'Error code' }),
})

export type GenerateMiniAppTokenErrorResponse = Static<typeof GenerateMiniAppTokenErrorResponse>
