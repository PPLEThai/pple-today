import { Static, t } from 'elysia'

import { AboutUs } from '../../../dtos/aboutus'

export const GetAboutUsResponse = t.Array(
  t.Composite([AboutUs, t.Object({ id: t.String({ description: 'About us ID' }) })])
)

export type GetAboutUsResponse = Static<typeof GetAboutUsResponse>

export const CreateAboutUsResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type CreateAboutUsResponse = Static<typeof CreateAboutUsResponse>
