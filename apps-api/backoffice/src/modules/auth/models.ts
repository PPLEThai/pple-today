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
  // role: t.String({ description: 'User role' }),
  // province: t.String({ description: 'User province' }),
})

export type GetAuthMeHeaders = Static<typeof GetAuthMeHeaders>
export type GetAuthMeResponse = Static<typeof GetAuthMeResponse>
