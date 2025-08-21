import Elysia from 'elysia'
import {
  GetDistinctQuery,
  GetDistinctResponse,
  GetPostalCodeQuery,
  GetPostalCodeResponse,
  GetProvinceResponse,
  GetSubDistinctQuery,
  GetSubDistinctResponse,
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
    '/distinct',
    async () => {
      return []
    },
    {
      query: GetDistinctQuery,
      response: {
        200: GetDistinctResponse,
      },
    }
  )
  .get(
    '/subdistinct',
    () => {
      return []
    },
    {
      query: GetSubDistinctQuery,
      response: {
        200: GetSubDistinctResponse,
      },
    }
  )
  .get(
    '/postal-code',
    () => {
      return []
    },
    {
      query: GetPostalCodeQuery,
      response: {
        200: GetPostalCodeResponse,
      },
    }
  )
