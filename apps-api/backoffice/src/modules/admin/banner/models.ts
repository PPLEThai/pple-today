import { Banner } from '@pple-today/api-common/dtos'
import { FilePath } from '@pple-today/api-common/dtos'
import {
  BannerInAppType,
  BannerNavigationType,
  BannerStatusType,
} from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const BannerIdParams = t.Object({
  id: t.String({ description: 'The ID of the banner item' }),
})
export type BannerIdParams = Static<typeof BannerIdParams>

// GET /admin/banners
export const GetBannersQuery = t.Object({
  search: t.Optional(t.String()),
  status: t.Optional(t.Array(t.Enum(BannerStatusType))),
})
export type GetBannersQuery = Static<typeof GetBannersQuery>

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
  inAppId: t.Optional(t.String({ description: 'The ID of the in-app content to open' })),
  inAppType: t.Optional(
    t.Enum(BannerInAppType, {
      description: 'The type of the in-app content to open',
    })
  ),
  miniAppId: t.Optional(t.String({ description: 'The ID of the mini app to open' })),
  destination: t.Optional(
    t.String({
      description: 'The destination URI for the banner item',
    })
  ),
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

// PATCH /admin/banners/{id}
export const UpdateBannerParams = BannerIdParams
export type UpdateBannerParams = Static<typeof UpdateBannerParams>

export const UpdateBannerBody = t.Partial(
  t.Object({
    headline: t.String({
      description: 'The headline for the banner item',
    }),
    miniAppId: t.Nullable(t.String({ description: 'The ID of the mini app to open' })),
    destination: t.Nullable(
      t.String({
        description: 'The destination URI for the banner item',
      })
    ),
    inAppId: t.Optional(t.String({ description: 'The ID of the in-app content to open' })),
    inAppType: t.Optional(
      t.Enum(BannerInAppType, {
        description: 'The type of the in-app content to open',
      })
    ),
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

// POST /admin/banners/{id}/reorder
export const ReorderBannerByIdParams = BannerIdParams
export type ReorderBannerByIdParams = Static<typeof GetBannerByIdParams>

export const ReorderBannerByIdBody = t.Object({
  movement: t.Union([t.Literal('up'), t.Literal('down')], {
    description: 'The direction of the movement',
  }),
})
export type ReorderBannerByIdBody = Static<typeof ReorderBannerByIdBody>

export const ReorderBannerByIdResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type ReorderBannerByIdResponse = Static<typeof ReorderBannerByIdResponse>
