import Elysia from 'elysia'

import { GetCarouselsResponse } from './models'
import { CarouselServicePlugin } from './services'

import { InternalErrorCode } from '../../dtos/error'
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'

export const CarouselController = new Elysia({
  tags: ['Carousel'],
  prefix: '/carousels',
})
  .use([CarouselServicePlugin])
  .get(
    '/',
    async ({ carouselService, status }) => {
      const carousels = await carouselService.getCarousels()

      if (carousels.isErr()) {
        return mapErrorCodeToResponse(carousels.error, status)
      }

      return status(200, carousels.value)
    },
    {
      response: {
        200: GetCarouselsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
