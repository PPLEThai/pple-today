import { Banner } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const GetBannersResponse = t.Array(
  t.Composite([
    t.Pick(Banner, ['id', 'navigation', 'destination']),
    t.Object({
      imageUrl: t.String({
        description: 'Public URL of the banner image',
        format: 'uri',
      }),
    }),
  ])
)
export type GetBannersResponse = Static<typeof GetBannersResponse>
