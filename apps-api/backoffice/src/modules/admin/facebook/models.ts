import { DetailedFacebookPage, FacebookPage } from '@pple-today/api-common/dtos'
import { FacebookPageLinkedStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const FacebookPageIdParams = t.Object({
  facebookPageId: t.String({ description: 'The ID of the facebook page' }),
})
export type FacebookPageIdParams = Static<typeof FacebookPageIdParams>

export const GetFacebookPagesQuery = t.Object({
  limit: t.Number(),
  page: t.Number(),
  search: t.Optional(t.String()),
  status: t.Optional(t.Array(t.Enum(FacebookPageLinkedStatus))),
})
export type GetFacebookPagesQuery = Static<typeof GetFacebookPagesQuery>

export const GetFacebookPagesResponse = t.Object({
  items: t.Array(FacebookPage),
  meta: t.Object({ count: t.Number() }),
})
export type GetFacebookPagesResponse = Static<typeof GetFacebookPagesResponse>

export const GetFacebookPageByIdParams = FacebookPageIdParams
export type GetFacebookPageByIdParams = Static<typeof FacebookPageIdParams>

export const GetFacebookPageByIdResponse = DetailedFacebookPage
export type GetFacebookPageByIdResponse = Static<typeof GetFacebookPageByIdResponse>

export const UpdateFacebookPageParams = FacebookPageIdParams
export type UpdateFacebookPageParams = Static<typeof UpdateFacebookPageParams>

export const UpdateFacebookPageBody = t.Partial(
  t.Object({
    name: t.String({ description: 'The name of the facebook page' }),
    status: t.Enum(FacebookPageLinkedStatus),
  })
)
export type UpdateFacebookPageBody = Static<typeof UpdateFacebookPageBody>

export const UpdateFacebookPageResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdateFacebookPageResponse = Static<typeof UpdateFacebookPageResponse>
