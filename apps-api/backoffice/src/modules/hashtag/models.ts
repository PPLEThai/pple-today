import { t } from 'elysia'

export const GetHashtagResponse = t.Object({
  id: t.String(),
  name: t.String(),
  createdAt: t.Date(),
  topics: t.Array(t.Object({ id: t.String(), name: t.String() })),
})
export type GetHashtagResponse = typeof GetHashtagResponse.static
