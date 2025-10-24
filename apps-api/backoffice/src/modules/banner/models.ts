import { Banner } from '@pple-today/api-common/dtos'
import { BannerNavigationType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const GetBannersResponse = t.Array(
  t.Union([
    t.Composite([
      t.Pick(Banner, ['id', 'destination']),
      t.Object({
        imageUrl: t.String({
          description: 'Public URL of the banner image',
          format: 'uri',
        }),
      }),
      t.Object({
        navigation: t.Literal(BannerNavigationType.MINI_APP),
        miniAppId: t.String({
          description: 'ID of the mini app',
        }),
      }),
    ]),
    t.Composite([
      t.Pick(Banner, ['id', 'destination']),
      t.Object({
        imageUrl: t.String({
          description: 'Public URL of the banner image',
          format: 'uri',
        }),
      }),
      t.Object({
        navigation: t.Union([
          t.Literal(BannerNavigationType.IN_APP_NAVIGATION),
          t.Literal(BannerNavigationType.EXTERNAL_BROWSER),
        ]),
      }),
    ]),
  ])
)

export type GetBannersResponse = Static<typeof GetBannersResponse>
