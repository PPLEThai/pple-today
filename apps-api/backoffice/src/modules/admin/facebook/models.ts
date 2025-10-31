import { DetailedFacebookPage, FacebookPage } from '@pple-today/api-common/dtos'
import { FacebookPageLinkedStatus, PostStatus } from '@pple-today/database/prisma'
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

export const UpdatePostParams = FacebookPageIdParams
export type UpdatePostParams = Static<typeof UpdatePostParams>

export const UpdatePostBody = t.Partial(
  t.Object({
    status: t.Enum(PostStatus, { description: 'The status of the post' }),
  })
)
export type UpdatePostBody = Static<typeof UpdatePostBody>

export const UpdatePostResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdatePostResponse = Static<typeof UpdatePostResponse>

export const DeletePostParams = FacebookPageIdParams
export type DeletePostParams = Static<typeof DeletePostParams>

export const DeletePostResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeletePostResponse = Static<typeof DeletePostResponse>
