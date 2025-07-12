import { t, TSchema } from 'elysia'

export const PaginationQuery = t.Object({
  page: t.Optional(t.Number({ description: 'The page number to retrieve', default: 1 })),
  limit: t.Optional(t.Number({ description: 'The number of items per page', default: 10 })),
  sortBy: t.Optional(t.String({ description: 'Field to sort by' })),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
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

export const ListResponse = <T extends TSchema>(itemSchema: T) => {
  return t.Composite([
    t.Object({
      data: t.Array(itemSchema),
    }),
    PaginationMetadataResponse,
  ])
}
