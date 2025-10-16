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
  appId: t.String({ description: 'The ID of the mini app' }),
})
export type CreateMiniAppTokenParams = Static<typeof CreateMiniAppTokenParams>

export const CreateMiniAppTokenResponse = t.Object({
  accessToken: t.String({ description: 'Access token for the mini app' }),
  expiresIn: t.Number({ description: 'Expiration time of the access token in seconds' }),
  id_token: t.String({ description: 'ID token of the authorized user' }),
  token_type: t.String({ description: 'Type of the token, e.g., Bearer' }),
})
export type CreateMiniAppTokenResponse = Static<typeof CreateMiniAppTokenResponse>

export const GenerateMiniAppTokenResponse = t.Object({
  access_token: t.String({ description: 'An access_token as JWT or opaque token' }),
  expires_in: t.Number({
    description: 'Number of second until the expiration of the access_token',
  }),
  id_token: t.String({ description: 'An id_token of the authorized user' }),
  scope: t.String({
    description:
      'Scopes of the access_token. These might differ from the provided scope parameter.',
  }),
  refresh_token: t.String({
    description: 'An opaque token. Only returned if offline_access scope was requested',
  }),
  token_type: t.Literal('Bearer', {
    description: 'Type of the access_token. Value is always Bearer',
  }),
})
export type GenerateMiniAppTokenResponse = Static<typeof GenerateMiniAppTokenResponse>
