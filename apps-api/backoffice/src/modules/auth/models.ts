import { UserRole } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const RegisterUserQuery = t.Object({
  role: t.Enum(UserRole, { description: 'User role' }),
})

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
  onBoardingCompleted: t.Boolean({ description: 'Whether the user has completed onboarding' }),
  profileImage: t.Optional(t.String({ description: 'User profile image URL' })),
  role: t.Enum(UserRole, { description: 'User role' }),
})

export type GetAuthMeHeaders = Static<typeof GetAuthMeHeaders>
export type GetAuthMeResponse = Static<typeof GetAuthMeResponse>
