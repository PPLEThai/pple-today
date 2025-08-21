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

export const AddressController = new Elysia({
  prefix: '/address',
  tags: ['Address'],
})
  .get(
    '/province',
    () => {
      return []
    },
    {
      response: GetProvinceResponse,
    }
  )
  .get(
    '/distinct',
    () => {
      return []
    },
    {
      query: GetDistinctQuery,
      response: GetDistinctResponse,
    }
  )
  .get(
    '/subdistinct',
    () => {
      return []
    },
    {
      query: GetSubDistinctQuery,
      response: GetSubDistinctResponse,
    }
  )
  .get(
    '/postal-code',
    () => {
      return []
    },
    {
      query: GetPostalCodeQuery,
      response: GetPostalCodeResponse,
    }
  )
