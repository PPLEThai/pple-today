import { t } from 'elysia'

export const GetProvinceResponse = t.Array(t.String())

export const GetDistrictQuery = t.Object({
  province: t.Optional(t.String()),
})
export const GetDistrictResponse = t.Array(t.String())

export const GetSubDistrictQuery = t.Object({
  distinct: t.Optional(t.String()),
})
export const GetSubDistrictResponse = t.Array(t.String())

export const GetPostalCodeQuery = t.Object({
  subdistrict: t.Optional(t.String()),
})
export const GetPostalCodeResponse = t.Array(t.String())
