import { InternalErrorCode } from '@pple-today/api-common/dtos'
import Elysia from 'elysia'

export const GlobalExceptionPlugin = new Elysia({
  name: 'GlobalExceptionPlugin',
})
  .onError(({ status, code, error }) => {
    if ('response' in error) {
      return status(error.code, error.response)
    }

    if (code === 'INTERNAL_SERVER_ERROR')
      return status(500, {
        error: {
          code: InternalErrorCode.INTERNAL_SERVER_ERROR,
          message: 'An internal error occurred',
        },
      })

    if (code === 'VALIDATION')
      return status(422, {
        error: {
          code: InternalErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          data: error.message,
        },
      })

    if (code === 'NOT_FOUND')
      return status(404, {
        error: {
          code: InternalErrorCode.NOT_FOUND,
          message: 'Resource not found',
        },
      })

    if (code === 'INVALID_FILE_TYPE')
      return status(400, {
        error: {
          code: InternalErrorCode.BAD_REQUEST,
          message: 'Invalid file type',
        },
      })

    return status(500, {
      error: {
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An internal error occurred',
      },
    })
  })
  .as('global')
