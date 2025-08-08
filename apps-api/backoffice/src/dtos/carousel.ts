import { Static, t } from 'elysia'

import { CarouselNavigationType, CarouselStatusType } from '../../__generated__/prisma'

export const Carousel = t.Object({
  id: t.String({ description: 'Carousel ID' }),
  imageFilePath: t.String({ description: 'Path to the carousel image file' }),
  status: t.Enum(CarouselStatusType, { description: 'Publish status of the carousel item' }),
  navigation: t.Enum(CarouselNavigationType, {
    description: 'How the app should navigate when the item is tapped',
  }),
  order: t.Number({ description: 'Display order (ascending)' }),
})
export type Carousel = Static<typeof Carousel>
