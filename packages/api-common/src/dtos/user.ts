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
