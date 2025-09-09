import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { GetBannersResponse } from './models'
import { BannerServicePlugin } from './services'

export const BannerController = new Elysia({
  tags: ['Banner'],
  prefix: '/banners',
})
  .use([BannerServicePlugin])
  .get(
    '/',
    async ({ bannerService, status }) => {
      const banners = await bannerService.getBanners()

      if (banners.isErr()) {
        return mapErrorCodeToResponse(banners.error, status)
      }

      return status(200, banners.value)
    },
    {
      response: {
        200: GetBannersResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get all banners',
        description: 'Retrieves a list of all banners',
      },
    }
  )
