import { Banner } from '@pple-today/api-common/dtos'
import { BannerInAppType, BannerNavigationType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const GetBannersResponse = t.Array(
  t.Union([
    t.Composite([
      t.Pick(Banner, ['id']),
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
        destination: t.String({
          description: 'The destination URI for the banner item',
        }),
      }),
    ]),
    t.Composite([
      t.Pick(Banner, ['id']),
      t.Object({
        imageUrl: t.String({
          description: 'Public URL of the banner image',
          format: 'uri',
        }),
      }),
      t.Object({
        navigation: t.Union([t.Literal(BannerNavigationType.EXTERNAL_BROWSER)]),
        destination: t.String({
          description: 'The destination URI for the banner item',
        }),
      }),
    ]),
    t.Composite([
      t.Pick(Banner, ['id']),
      t.Object({
        imageUrl: t.String({
          description: 'Public URL of the banner image',
          format: 'uri',
        }),
      }),
      t.Object({
        navigation: t.Literal(BannerNavigationType.IN_APP_NAVIGATION),
        inAppId: t.String({
          description: 'ID of the in-app content',
        }),
        inAppType: t.Enum(BannerInAppType, {
          description: 'Type of the in-app content',
        }),
      }),
    ]),
  ])
)

export { BannerInAppType }
export type GetBannersResponse = Static<typeof GetBannersResponse>
