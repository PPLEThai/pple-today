import Elysia from 'elysia'

import { GetOptimizedImageUrlParams, GetOptimizedImageUrlQuery } from './models'
import { FileServerServicePlugin } from './services'

export const FileServerController = new Elysia({
  tags: ['Files'],
})
  .use(FileServerServicePlugin)
  .get(
    '/files/*',
    ({ params, query, fileServerService, redirect }) => {
      const path = params['*']

      const optimizedUrl = fileServerService.getOptimizedFileUrl(path, {
        width: query.width,
        height: query.height,
        quality: query.quality,
      })

      throw redirect(optimizedUrl, 302)
    },
    {
      detail: {
        summary: 'Get Optimized Image URL',
        description: 'Get an optimized image URL from the image server',
      },
      params: GetOptimizedImageUrlParams,
      query: GetOptimizedImageUrlQuery,
    }
  )
