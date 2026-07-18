import { Static, t } from 'elysia'

export const GetMiniAppUserCountParams = t.Object({
  id: t.String({ description: 'Mini app id' }),
})
export type GetMiniAppUserCountParams = Static<typeof GetMiniAppUserCountParams>

export const GetMiniAppUserCountResponse = t.Object({
  count: t.Integer({ description: 'Number of App Users who have opened this mini app' }),
})
export type GetMiniAppUserCountResponse = Static<typeof GetMiniAppUserCountResponse>
