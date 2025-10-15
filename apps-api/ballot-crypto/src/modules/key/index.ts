import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { CreateKeysBody, CreateKeysResponse, DeleteKeysParams } from './models'
import { KeyServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/admin-auth-guard'

export const KeyController = new Elysia({
  prefix: '/keys',
  tags: ['Keys'],
})
  .use([KeyServicePlugin, AuthGuardPlugin])
  .post(
    '/',
    async ({ body, status, keyService }) => {
      const result = await keyService.createElectionKeys(body.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(201, {
        message: 'Create keys success',
      })
    },
    {
      detail: {
        summary: 'Create Election Keys',
        description: 'Create asymmetric encryption and signing keys for election',
      },
      validateBackoffice: true,
      body: CreateKeysBody,
      response: {
        201: CreateKeysResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.KEY_ALREADY_EXIST,
          InternalErrorCode.KET_NOT_FOUND
        ),
      },
    }
  )
  .delete(
    '/:electionId',
    async ({ params, status, keyService }) => {
      const result = await keyService.destroyElectionKeys(params.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(204)
    },
    {
      detail: {
        summary: 'Delete Election Keys',
        description: 'Delete asymmetric encryption and signing keys for election',
      },
      validateBackoffice: true,
      params: DeleteKeysParams,
      responses: {
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.KET_NOT_FOUND
        ),
      },
    }
  )
