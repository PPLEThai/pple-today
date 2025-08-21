import { t } from 'elysia'

export const GetProvinceResponse = t.Array(t.String())

export const GetDistinctQuery = t.Object({
  province: t.Optional(t.String()),
})
export const GetDistinctResponse = t.Array(t.String())

export const GetSubDistinctQuery = t.Object({
  distinct: t.Optional(t.String()),
})
export const GetSubDistinctResponse = t.Array(t.String())

export const GetPostalCodeQuery = t.Object({
  subdistinct: t.Optional(t.String()),
})
export const GetPostalCodeResponse = t.Array(t.String())
