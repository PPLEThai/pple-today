import { Static, t } from 'elysia'

import { CarouselNavigationType, CarouselStatusType } from '../../../../__generated__/prisma'
import { Carousel } from '../../../dtos/carousel'

// GET /admin/carousels
export const GetCarouselsResponse = t.Array(Carousel)
export type GetCarouselsResponse = Static<typeof GetCarouselsResponse>

// GET /admin/carousels/{id}
export const GetCarouselByIdParams = t.Object({
  id: t.String({ description: 'The ID of the carousel item' }),
})
export type GetCarouselByIdParams = Static<typeof GetCarouselByIdParams>

export const GetCarouselByIdResponse = Carousel
export type GetCarouselByIdResponse = Static<typeof GetCarouselByIdResponse>

// POST /admin/carousels
export const CreateCarouselBody = t.Object({
  imageFilePath: t.String({ description: 'Path to the carousel image file' }),
  status: t.Enum(CarouselStatusType, { description: 'Publish status of the carousel item' }),
  navigation: t.Enum(CarouselNavigationType, {
    description: 'How the app should navigate when the item is tapped',
  }),
})
export type CreateCarouselBody = Static<typeof CreateCarouselBody>

export const CreateCarouselResponse = t.Object({
  id: t.String({ description: 'The ID of the created carousel item' }),
})
export type CreateCarouselResponse = Static<typeof CreateCarouselResponse>

// PUT /admin/carousels/{id}
export const UpdateCarouselParams = t.Object({
  id: t.String({ description: 'The ID of the carousel item' }),
})
export type UpdateCarouselParams = Static<typeof UpdateCarouselParams>

export const UpdateCarouselBody = t.Object({
  imageFilePath: t.String({ description: 'Path to the carousel image file' }),
  status: t.Enum(CarouselStatusType, { description: 'Publish status of the carousel item' }),
  navigation: t.Enum(CarouselNavigationType, {
    description: 'How the app should navigate when the item is tapped',
  }),
})
export type UpdateCarouselBody = Static<typeof UpdateCarouselBody>

export const UpdateCarouselResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdateCarouselResponse = Static<typeof UpdateCarouselResponse>

// DELETE /admin/carousels/{id}
export const DeleteCarouselParams = t.Object({
  id: t.String({ description: 'The ID of the carousel item' }),
})
export type DeleteCarouselParams = Static<typeof DeleteCarouselParams>

export const DeleteCarouselResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteCarouselResponse = Static<typeof DeleteCarouselResponse>

export const ReorderCarouselBody = t.Object({
  ids: t.Array(t.String(), {
    description: 'Array of carousel IDs in the new order',
  }),
})
export type ReorderCarouselBody = Static<typeof ReorderCarouselBody>

export const ReorderCarouselResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type ReorderCarouselResponse = Static<typeof ReorderCarouselResponse>
