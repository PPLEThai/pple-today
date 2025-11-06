import { UserStatus } from '@pple-today/database/prisma'
import { t } from 'elysia'

export const Author = t.Object({
  id: t.String({ description: 'The ID of the author' }),
  name: t.String({ description: 'The name of the author' }),
  address: t.Optional(
    t.Object(
      {
        province: t.String({ description: 'The province of the author' }),
        district: t.String({ description: 'The district of the author' }),
      },
      { description: 'The address of the author' }
    )
  ),
  profileImage: t.Optional(t.String({ description: 'The profile image URL of the author' })),
})

export const User = t.Object({
  id: t.String({ description: 'The ID of the user' }),
  name: t.String({ description: 'The name of the user' }),
  phoneNumber: t.String({ description: 'The phone number of the user' }),
  roles: t.Array(t.String({ description: 'The role of the user' })),
  status: t.Enum(UserStatus, { description: 'The status of the user' }),
})

export const DetailedUser = t.Composite([
  User,
  t.Object({
    profileImage: t.Optional(t.String({ description: 'The profile image URL of the user' })),
    responsibleArea: t.Nullable(t.String({ description: 'The responsible area of the user' })),
  }),
])
