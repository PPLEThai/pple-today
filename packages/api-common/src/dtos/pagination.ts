import { Static, t, TSchema } from 'elysia'

export const PaginationQuery = t.Object({
  page: t.Optional(t.Number({ description: 'The page number to retrieve', default: 1 })),
  limit: t.Optional(t.Number({ description: 'The number of items per page', default: 10 })),
})
export type PaginationQuery = Static<typeof PaginationQuery>

export const PaginationMetadataResponse = t.Object({
  meta: t.Object({
    totalPage: t.Number({ description: 'Total number of page' }),
    currentPage: t.Number({ description: 'Current page number' }),
  }),
})
export type PaginationMetadataResponse = Static<typeof PaginationMetadataResponse>

export const CursorPaginationQuery = t.Object({
  cursor: t.Optional(
    t.String({
      description: 'The cursor for pagination which should be last item ID of previous page',
    })
  ),
  limit: t.Optional(t.Number({ description: 'The number of items per page', default: 10 })),
})
export type CursorPaginationQuery = Static<typeof CursorPaginationQuery>

export const ListQuery = <T extends TSchema>(baseQuery: T) => {
  return t.Composite([baseQuery, PaginationQuery])
}

export const ListCursorQuery = <T extends TSchema>(baseQuery: T) => {
  return t.Composite([baseQuery, CursorPaginationQuery])
}
