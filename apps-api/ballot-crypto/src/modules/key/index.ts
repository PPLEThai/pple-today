import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CreateKeysBody,
  CreateKeysResponse,
  DeleteKeysParams,
  DeleteKeysResponse,
  RestoreKeysParams,
  RestoreKeysResponse,
} from './models'
import { KeyServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

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
          InternalErrorCode.ELECTION_KEY_ALREADY_EXIST,
          InternalErrorCode.ELECTION_KEY_NOT_FOUND
        ),
      },
    }
  )
  .put(
    '/:electionId/restore',
    async ({ status, keyService, params }) => {
      const result = await keyService.restoreElectionKeys(params.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, {
        message: 'Restore keys successfully',
      })
    },
    {
      detail: {
        summary: 'Restore keys',
        description: 'Restore keys',
      },
      validateBackoffice: true,
      params: RestoreKeysParams,
      response: {
        200: RestoreKeysResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.ELECTION_KEY_NOT_FOUND
        ),
      },
    }
  )
  .delete(
    '/:electionId',
    async ({ params, status, keyService }) => {
      const result = await keyService.destroyElectionKeys(params.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      detail: {
        summary: 'Delete Election Keys',
        description: 'Delete asymmetric encryption and signing keys for election',
      },
      validateBackoffice: true,
      params: DeleteKeysParams,
      responses: {
        200: DeleteKeysResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.ELECTION_KEY_NOT_FOUND
        ),
      },
    }
  )
