import { BannerNavigationType, BannerStatusType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { FilePath } from './file'

export const BaseBanner = t.Object({
  id: t.String({ description: 'Banner ID' }),
  image: t.Object({
    url: t.String({ description: 'Path to the banner image file' }),
    filePath: FilePath,
  }),
  status: t.Enum(BannerStatusType, { description: 'Publish status of the banner item' }),
  destination: t.String({
    description: 'The destination URI for the banner item',
  }),
  order: t.Number({ description: 'Display order (ascending)' }),
})
export type BaseBanner = Static<typeof BaseBanner>

export const Banner = t.Union([
  t.Composite([
    BaseBanner,
    t.Object({
      navigation: t.Union([
        t.Literal(BannerNavigationType.EXTERNAL_BROWSER, {
          description: 'How the app should navigate when the item is tapped',
        }),
        t.Literal(BannerNavigationType.IN_APP_NAVIGATION, {
          description: 'How the app should navigate when the item is tapped',
        }),
      ]),
    }),
  ]),
  t.Composite([
    BaseBanner,
    t.Object({
      navigation: t.Literal(BannerNavigationType.MINI_APP, {
        description: 'How the app should navigate when the item is tapped',
      }),
      miniAppId: t.String({
        description: 'The ID of the mini app to open',
      }),
      miniAppUrl: t.String({
        description: 'The URL of the mini app to open',
      }),
    }),
  ]),
])
export type Banner = Static<typeof Banner>
