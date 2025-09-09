import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  GetDistrictQuery,
  GetDistrictResponse,
  GetPostalCodeQuery,
  GetPostalCodeResponse,
  GetProvinceResponse,
  GetSubDistrictQuery,
  GetSubDistrictResponse,
} from './models'
import { AddressServicePlugin } from './service'

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
      detail: {
        summary: 'Get Provinces',
        description: 'Retrieve a list of provinces',
      },
    }
  )
  .get(
    '/district',
    async ({ query, addressService, status }) => {
      const districts = await addressService.getDistricts({
        province: query.province,
      })

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
      detail: {
        summary: 'Get Districts',
        description:
          'Retrieve a list of districts for a given province, \
           if province is not provided, it will return all districts',
      },
    }
  )
  .get(
    '/subdistrict',
    async ({ addressService, status, query }) => {
      const subDistricts = await addressService.getSubDistricts({
        province: query.province,
        district: query.district,
      })

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
      detail: {
        summary: 'Get Sub-Districts',
        description:
          'Retrieve a list of sub-districts for a given province and district,\
           if province or district is not provided, it will return all sub-districts',
      },
    }
  )
  .get(
    '/postal-code',
    async ({ addressService, status, query }) => {
      const postalCodes = await addressService.getPostalCodes({
        province: query.province,
        district: query.district,
        subDistrict: query.subdistrict,
      })

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
      detail: {
        summary: 'Get Postal Codes',
        description:
          'Retrieve a list of postal codes for a given province, district, and sub-district,\
           if any of these are not provided, it will return all postal codes',
      },
    }
  )
