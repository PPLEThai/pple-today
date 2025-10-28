import { Banner } from '@pple-today/api-common/dtos'
import { FilePath } from '@pple-today/api-common/dtos'
import { BannerNavigationType, BannerStatusType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const BannerIdParams = t.Object({
  id: t.String({ description: 'The ID of the banner item' }),
})
export type BannerIdParams = Static<typeof BannerIdParams>

// GET /admin/banners
export const GetBannersResponse = t.Array(Banner)
export type GetBannersResponse = Static<typeof GetBannersResponse>

// GET /admin/banners/{id}
export const GetBannerByIdParams = BannerIdParams
export type GetBannerByIdParams = Static<typeof GetBannerByIdParams>

export const GetBannerByIdResponse = Banner
export type GetBannerByIdResponse = Static<typeof GetBannerByIdResponse>

// POST /admin/banners
export const CreateBannerBody = t.Object({
  headline: t.String({
    description: 'The headline for the banner item',
  }),
  destination: t.String({
    description: 'The destination URI for the banner item',
  }),
  navigation: t.Enum(BannerNavigationType, {
    description: 'How the app should navigate when the item is tapped',
  }),
  imageFilePath: FilePath,
})
export type CreateBannerBody = Static<typeof CreateBannerBody>

export const CreateBannerResponse = t.Object({
  id: t.String({ description: 'The ID of the created banner item' }),
})
export type CreateBannerResponse = Static<typeof CreateBannerResponse>

// PUT /admin/banners/{id}
export const UpdateBannerParams = BannerIdParams
export type UpdateBannerParams = Static<typeof UpdateBannerParams>

export const UpdateBannerBody = t.Partial(
  t.Object({
    headline: t.String({
      description: 'The headline for the banner item',
    }),
    destination: t.String({
      description: 'The destination URI for the banner item',
    }),
    navigation: t.Enum(BannerNavigationType, {
      description: 'How the app should navigate when the item is tapped',
    }),
    imageFilePath: FilePath,
    order: t.Number({ description: 'Display order (ascending)' }),
    status: t.Enum(BannerStatusType, { description: 'Publish status of the banner item' }),
  })
)
export type UpdateBannerBody = Static<typeof UpdateBannerBody>

export const UpdateBannerResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdateBannerResponse = Static<typeof UpdateBannerResponse>

// DELETE /admin/banners/{id}
export const DeleteBannerParams = BannerIdParams
export type DeleteBannerParams = Static<typeof DeleteBannerParams>

export const DeleteBannerResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteBannerResponse = Static<typeof DeleteBannerResponse>

export const ReorderBannerBody = t.Object({
  ids: t.Array(t.String(), {
    description: 'Array of banner IDs in the new order',
  }),
})
export type ReorderBannerBody = Static<typeof ReorderBannerBody>

export const ReorderBannerResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type ReorderBannerResponse = Static<typeof ReorderBannerResponse>
