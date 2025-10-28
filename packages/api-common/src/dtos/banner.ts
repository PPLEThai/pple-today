import { BannerNavigationType, BannerStatusType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { FilePath } from './file'

export const Banner = t.Object({
  id: t.String({ description: 'Banner ID' }),
  image: t.Object({
    url: t.String({ description: 'Path to the banner image file' }),
    filePath: FilePath,
  }),
  headline: t.String({
    description: 'The headline for the banner item',
  }),
  status: t.Enum(BannerStatusType, { description: 'Publish status of the banner item' }),
  navigation: t.Enum(BannerNavigationType, {
    description: 'How the app should navigate when the item is tapped',
  }),
  destination: t.String({
    description: 'The destination URI for the banner item',
  }),
  order: t.Number({ description: 'Display order (ascending)' }),
  createdAt: t.Date({ description: 'The creation date of the banner' }),
  updatedAt: t.Date({ description: 'The update date of the banner' }),
})
export type Banner = Static<typeof Banner>
