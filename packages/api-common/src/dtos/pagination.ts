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
    count: t.Number({ description: 'Total number of records' }),
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

export const ListPaginationQuery = <T extends TSchema>(baseQuery: T) => {
  return t.Composite([baseQuery, PaginationQuery])
}

export const ListCursorQuery = <T extends TSchema>(baseQuery: T) => {
  return t.Composite([baseQuery, CursorPaginationQuery])
}

export const ListPaginationReponse = <T extends TSchema>(itemSchema: T) => {
  return t.Composite([
    t.Object({
      items: t.Array(itemSchema),
    }),
    PaginationMetadataResponse,
  ])
}
export type ListPaginationResponse<T> = {
  items: T[]
  meta: {
    totalPage: number
    currentPage: number
  }
}

export const ListCursorResponse = <T extends TSchema>(itemSchema: T) => {
  return t.Object({
    items: t.Array(itemSchema),
    meta: t.Object({
      cursor: t.Object({
        next: t.Nullable(
          t.String({
            description: 'The cursor for the next page which is the last item ID of current page',
          })
        ),
        previous: t.Nullable(
          t.String({
            description:
              'The cursor for the previous page which is the first item ID of current page',
          })
        ),
      }),
    }),
  })
}

export type ListCursorResponse<T> = {
  items: T[]
  meta: {
    cursor: {
      next: string | null
      previous: string | null
    }
  }
}
