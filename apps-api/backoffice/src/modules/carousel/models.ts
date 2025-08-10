import { Static, t } from 'elysia'

import { Carousel } from '../../dtos/carousel'

export const GetCarouselsResponse = t.Array(
  t.Pick(Carousel, ['id', 'navigation', 'order', 'imageFilePath'])
)
export type GetCarouselsResponse = Static<typeof GetCarouselsResponse>
