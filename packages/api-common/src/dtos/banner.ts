import { FilePath } from '@pple-today/api-common/dtos'
import { BannerNavigationType, BannerStatusType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const Banner = t.Object({
  id: t.String({ description: 'Banner ID' }),
  image: t.Object({
    url: t.String({ description: 'Path to the banner image file' }),
    filePath: FilePath,
  }),
  status: t.Enum(BannerStatusType, { description: 'Publish status of the banner item' }),
  navigation: t.Enum(BannerNavigationType, {
    description: 'How the app should navigate when the item is tapped',
  }),
  destination: t.String({
    description: 'The destination URI for the banner item',
  }),
  order: t.Number({ description: 'Display order (ascending)' }),
})
export type Banner = Static<typeof Banner>
