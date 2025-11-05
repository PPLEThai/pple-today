import Elysia from 'elysia'

import { GetOptimizedImageUrlParams, GetOptimizedImageUrlQuery } from './models'
import { FileServerServicePlugin } from './services'

export const FileServerController = new Elysia({
  prefix: '/files',
  tags: ['Files'],
})
  .use(FileServerServicePlugin)
  .get(
    '/*',
    ({ params, query, fileServerService, set }) => {
      const filePath = params['*']
      const optimizedUrl = fileServerService.getOptimizedFileUrl(filePath, {
        width: query.width,
        height: query.height,
        quality: query.quality,
      })

      set.headers['location'] = optimizedUrl
      set.status = 302
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
