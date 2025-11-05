import { PublicFilePath } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const GetOptimizedImageUrlParams = t.Object({
  path: PublicFilePath,
})
export type GetOptimizedImageUrlParams = Static<typeof GetOptimizedImageUrlParams>

export const GetOptimizedImageUrlQuery = t.Object({
  width: t.Optional(t.Number()),
  height: t.Optional(t.Number()),
  quality: t.Optional(t.Number({ default: 80 })),
})
export type GetOptimizedImageUrlQuery = Static<typeof GetOptimizedImageUrlQuery>

export const GetOptimizedImageUrlResponse = t.Object({
  url: t.String(),
})
export type GetOptimizedImageUrlResponse = Static<typeof GetOptimizedImageUrlResponse>
