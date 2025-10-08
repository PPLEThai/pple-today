import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { CreateKeyBody, DeleteKeyParams } from './models'
import { KeyServicePlugin } from './services'

export const KeyController = new Elysia({
  prefix: '/keys',
  tags: ['Keys'],
})
  .use(KeyServicePlugin)
  .post(
    '/',
    async ({ body, status, keyService }) => {
      const result = await keyService.createElectionKeys(body.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(201)
    },
    {
      detail: {
        summary: 'Create Election Keys',
        description: 'Create asymmetric encryption and signing keys for election',
      },
      body: CreateKeyBody,
      responses: {
        201: {},
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
      params: DeleteKeyParams,
      responses: {
        204: {},
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.KET_NOT_FOUND
        ),
      },
    }
  )
