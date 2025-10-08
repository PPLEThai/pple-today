import { Static, t } from 'elysia'

export const SearchKeyword = t.Union([
  t.Object({
    type: t.Literal('USER'),
    id: t.String(),
    name: t.String(),
    profileImage: t.Nullable(t.String()),
  }),
  t.Object({
    type: t.Literal('TOPIC'),
    id: t.String(),
    name: t.String(),
    bannerImage: t.Nullable(t.String()),
  }),
  t.Object({
    type: t.Literal('QUERY'),
    query: t.String(),
  }),
])
export type SearchKeyword = Static<typeof SearchKeyword>

export const SearchQuery = t.Object({
  search: t
    .Transform(
      t.String({
        minLength: 1,
      })
    )
    .Decode((value) => decodeURIComponent(value.trim()))
    .Encode((value) => encodeURIComponent(value.trim())),
  limit: t.Optional(t.Number()),
  cursor: t.Optional(t.String()),
})
export type SearchQuery = Static<typeof SearchQuery>
