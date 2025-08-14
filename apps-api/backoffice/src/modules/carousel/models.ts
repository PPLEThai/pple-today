import { Static, t } from 'elysia'

import { Carousel } from '../../dtos/carousel'

export const GetCarouselsResponse = t.Array(
  t.Composite([
    t.Pick(Carousel, ['id', 'navigation', 'order']),
    t.Object({
      imageUrl: t.String({
        description: 'Public URL of the carousel image',
        format: 'uri',
      }),
    }),
  ])
)
export type GetCarouselsResponse = Static<typeof GetCarouselsResponse>
