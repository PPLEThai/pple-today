import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { CreateUploadSignedUrlBody, CreateUploadSignedUrlResponse } from './models'
import { AdminFileServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminFileController = new Elysia({ prefix: '/file', tags: ['Admin File'] })
  .use([AdminFileServicePlugin, AdminAuthGuardPlugin])
  .post(
    '/upload-url',
    async ({ fileService, status, body }) => {
      const result = await fileService.createUploadSignedUrl(body)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      body: CreateUploadSignedUrlBody,
      response: {
        200: CreateUploadSignedUrlResponse,
        ...createErrorSchema(
          InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          InternalErrorCode.FILE_UNSUPPORTED_MIME_TYPE
        ),
      },
      detail: {
        summary: 'Get upload signed URL',
        description: 'Get upload signed URL',
      },
    }
  )
