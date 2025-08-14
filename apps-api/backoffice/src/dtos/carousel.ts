import { Static, t } from 'elysia'

import { CarouselNavigationType, CarouselStatusType } from '../../__generated__/prisma'

export const Carousel = t.Object({
  id: t.String({ description: 'Carousel ID' }),
  image: t.Object({
    url: t.String({ description: 'Path to the carousel image file' }),
    filePath: t.String({ description: 'File path of the carousel image' }),
  }),
  status: t.Enum(CarouselStatusType, { description: 'Publish status of the carousel item' }),
  navigation: t.Enum(CarouselNavigationType, {
    description: 'How the app should navigate when the item is tapped',
  }),
  destination: t.String({
    description: 'The destination URI for the carousel item',
  }),
  order: t.Number({ description: 'Display order (ascending)' }),
})
export type Carousel = Static<typeof Carousel>
