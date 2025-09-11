import { Static, t } from 'elysia'

export const GetProvinceResponse = t.Array(t.String())
export type GetProvinceResponse = Static<typeof GetProvinceResponse>

export const GetDistrictQuery = t.Object({
  province: t.Optional(t.String()),
})
export type GetDistrictQuery = Static<typeof GetDistrictQuery>

export const GetDistrictResponse = t.Array(t.String())
export type GetDistrictResponse = Static<typeof GetDistrictResponse>

export const GetSubDistrictQuery = t.Object({
  province: t.Optional(t.String()),
  district: t.Optional(t.String()),
})
export type GetSubDistrictQuery = Static<typeof GetSubDistrictQuery>

export const GetSubDistrictResponse = t.Array(t.String())
export type GetSubDistrictResponse = Static<typeof GetSubDistrictResponse>

export const GetPostalCodeQuery = t.Object({
  province: t.Optional(t.String()),
  district: t.Optional(t.String()),
  subdistrict: t.Optional(t.String()),
})
export type GetPostalCodeQuery = Static<typeof GetPostalCodeQuery>

export const GetPostalCodeResponse = t.Array(t.String())
export type GetPostalCodeResponse = Static<typeof GetPostalCodeResponse>
