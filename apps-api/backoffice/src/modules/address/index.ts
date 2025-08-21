import Elysia from 'elysia'
import {
  GetDistrictQuery,
  GetDistrictResponse,
  GetPostalCodeQuery,
  GetPostalCodeResponse,
  GetProvinceResponse,
  GetSubDistrictQuery,
  GetSubDistrictResponse,
} from './model'
import { AddressServicePlugin } from './service'
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'
import { InternalErrorCode } from '../../dtos/error'

export const AddressController = new Elysia({
  prefix: '/address',
  tags: ['Address'],
})
  .use(AddressServicePlugin)
  .get(
    '/province',
    async ({ addressService, status }) => {
      const provinces = await addressService.getProvinces()

      if (provinces.isErr()) {
        return mapErrorCodeToResponse(provinces.error, status)
      }

      return status(200, provinces.value)
    },
    {
      response: {
        200: GetProvinceResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .get(
    '/district',
    async ({ query, addressService, status }) => {
      const districts = await addressService.getDistricts(query.province)

      if (districts.isErr()) {
        return mapErrorCodeToResponse(districts.error, status)
      }

      return status(200, districts.value)
    },
    {
      query: GetDistrictQuery,
      response: {
        200: GetDistrictResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .get(
    '/subdistinct',
    async ({ addressService, status, query }) => {
      const subDistricts = await addressService.getSubDistricts(query.distinct)

      if (subDistricts.isErr()) {
        return mapErrorCodeToResponse(subDistricts.error, status)
      }

      return status(200, subDistricts.value)
    },
    {
      query: GetSubDistrictQuery,
      response: {
        200: GetSubDistrictResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .get(
    '/postal-code',
    async ({ addressService, status, query }) => {
      const postalCodes = await addressService.getPostalCodes(query.subdistrict)

      if (postalCodes.isErr()) {
        return mapErrorCodeToResponse(postalCodes.error, status)
      }

      return status(200, postalCodes.value)
    },
    {
      query: GetPostalCodeQuery,
      response: {
        200: GetPostalCodeResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
