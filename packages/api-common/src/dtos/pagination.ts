import { t, TSchema } from 'elysia'

export const PaginationQuery = t.Object({
  page: t.Optional(t.Number({ description: 'The page number to retrieve', default: 1 })),
  limit: t.Optional(t.Number({ description: 'The number of items per page', default: 10 })),
})

export const PaginationMetadataResponse = t.Object({
  meta: t.Object({
    totalPage: t.Number({ description: 'Total number of page' }),
    currentPage: t.Number({ description: 'Current page number' }),
  }),
})

export const ListQuery = <T extends TSchema>(baseQuery: T) => {
  return t.Composite([baseQuery, PaginationQuery])
}
