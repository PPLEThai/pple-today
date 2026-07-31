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

export const CreateMiniAppTokenResponse = t.Object({
  url: t.String({ description: 'The URL to access the mini app with the generated token' }),
  appName: t.String({ description: 'The name of the mini app' }),
})
export type CreateMiniAppTokenResponse = Static<typeof CreateMiniAppTokenResponse>

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
