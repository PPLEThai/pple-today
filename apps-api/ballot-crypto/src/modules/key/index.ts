import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { CreateKeyBody, CreateKeyResponse } from './models'
import { KeyServicePlugin } from './services'

export const KeyController = new Elysia({
  prefix: '/keys',
  tags: ['Keys'],
})
  .use(KeyServicePlugin)
  .post(
    '/',
    async ({ body, status, keyService }) => {
      const result = await keyService.createElectionEncryptionKey(body.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(201, result.value)
    },
    {
      detail: {
        summary: 'Create Encryption Key',
        description: 'Create Asymetric Encryption Key for Election',
      },
      body: CreateKeyBody,
      response: {
        201: CreateKeyResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.KEY_ALREADY_EXIST
        ),
      },
    }
  )
