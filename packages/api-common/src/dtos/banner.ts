import {
  BannerInAppType,
  BannerNavigationType,
  BannerStatusType,
} from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { FilePath } from './file'

export const BaseBanner = t.Object({
  id: t.String({ description: 'Banner ID' }),
  image: t.Object({
    url: t.String({ description: 'Path to the banner image file' }),
    filePath: FilePath,
  }),
  headline: t.String({
    description: 'The headline for the banner item',
  }),
  status: t.Enum(BannerStatusType, { description: 'Publish status of the banner item' }),
  order: t.String({ description: 'Display order (ascending)' }),
  createdAt: t.Date({ description: 'The creation date of the banner' }),
  updatedAt: t.Date({ description: 'The update date of the banner' }),
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
      ]),
      destination: t.String({
        description: 'The destination URI for the banner item',
      }),
    }),
  ]),
  t.Composite([
    BaseBanner,
    t.Object({
      navigation: t.Literal(BannerNavigationType.IN_APP_NAVIGATION, {
        description: 'How the app should navigate when the item is tapped',
      }),
      inAppId: t.String({
        description: 'The ID of the in-app content to open',
      }),
      inAppType: t.Enum(BannerInAppType, {
        description: 'The type of the in-app content to open',
      }),
    }),
  ]),
  t.Composite([
    BaseBanner,
    t.Object({
      navigation: t.Literal(BannerNavigationType.MINI_APP, {
        description: 'How the app should navigate when the item is tapped',
      }),
      destination: t.String({
        description: 'The destination URI for the banner item',
      }),
      miniAppId: t.String({
        description: 'The ID of the mini app to open',
      }),
      miniApp: t.Object({
        name: t.String({
          description: 'The name of the mini app to open',
        }),
      }),
    }),
  ]),
])
export type Banner = Static<typeof Banner>

export const FlatBanner = t.Composite([
  BaseBanner,
  t.Object({
    navigation: t.Enum(BannerNavigationType, {
      description: 'How the app should navigate when the item is tapped',
    }),
    miniAppId: t.Optional(
      t.String({
        description: 'The ID of the mini app to open',
      })
    ),
    miniApp: t.Optional(
      t.Object({
        name: t.String({
          description: 'The name of the mini app to open',
        }),
      })
    ),
    destination: t.Optional(
      t.String({
        description: 'The destination URI for the banner item',
      })
    ),
    inAppId: t.Optional(
      t.String({
        description: 'The ID of the in-app content to open',
      })
    ),
    inAppType: t.Optional(
      t.Enum(BannerInAppType, {
        description: 'The type of the in-app content to open',
      })
    ),
  }),
])
export type FlatBanner = Static<typeof FlatBanner>
