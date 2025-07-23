import { Static, t } from 'elysia'

import { AboutUs } from '../../../dtos/about-us'

export const GetAboutUsResponse = t.Array(AboutUs)
export type GetAboutUsResponse = Static<typeof GetAboutUsResponse>

export const CreateAboutUsResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type CreateAboutUsResponse = Static<typeof CreateAboutUsResponse>

export const UpdateAboutUsResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdateAboutUsResponse = Static<typeof CreateAboutUsResponse>

export const DeleteAboutUsResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteAboutUsResponse = Static<typeof CreateAboutUsResponse>
