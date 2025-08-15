import Elysia from 'elysia'

import { GetUploadSignedUrlBody, GetUploadSignedUrlResponse } from './models'
import { AdminFileServicePlugin } from './services'

import { InternalErrorCode } from '../../../dtos/error'
import { AuthGuardPlugin } from '../../../plugins/auth-guard'
import { createErrorSchema, mapErrorCodeToResponse } from '../../../utils/error'

export const AdminFileController = new Elysia({ prefix: '/file', tags: ['Admin File'] })
  .use([AdminFileServicePlugin, AuthGuardPlugin])
  .post(
    '/upload-url',
    async ({ fileService, status, body }) => {
      const result = await fileService.getUploadSignedUrl(body)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      body: GetUploadSignedUrlBody,
      response: {
        200: GetUploadSignedUrlResponse,
        ...createErrorSchema(InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR),
      },
      detail: {
        summary: 'Get upload signed URL',
        description: 'Get upload signed URL',
      },
    }
  )
