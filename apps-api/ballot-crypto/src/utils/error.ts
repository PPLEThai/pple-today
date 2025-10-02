import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { ApiErrorResponse, err, OnlyErr, WithoutErr } from '@pple-today/api-common/utils'
import { Err, Ok, ok, Result } from 'neverthrow'
import { Simplify, ValueOf } from 'type-fest'

export const googleError = {
  0: 'OK',
  1: 'CANCELLED',
  2: 'UNKNOWN',
  3: 'INVALID_ARGUMENT',
  4: 'DEADLINE_EXCEEDED',
  5: 'NOT_FOUND',
  6: 'ALREADY_EXISTS',
  7: 'PERMISSION_DENIED',
  8: 'RESOURCE_EXHAUSTED',
  9: 'FAILED_PRECONDITION',
  10: 'ABORTED',
  11: 'OUT_OF_RANGE',
  12: 'UNIMPLEMENTED',
  13: 'INTERNAL',
  14: 'UNAVAILABLE',
  15: 'DATA_LOSS',
  16: 'UNAUTHENTICATED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type GoogleErrorCode = ValueOf<typeof googleError>

export type RawGoogleError = {
  code: GoogleErrorCode
  message?: string
  originalError: any
}

export function resolveGoogleAPIError(error: unknown): RawGoogleError {
  if (error instanceof Error && 'code' in error && 'details' in error) {
    const code = googleError[error.code as keyof typeof googleError] || googleError.UNKNOWN_ERROR
    return {
      code: code,
      message: error.details as string,
      originalError: error,
    }
  }
  return {
    code: googleError.UNKNOWN_ERROR,
    message: 'An unknown error occurs',
    originalError: error,
  }
}

export async function fromGoogleAPIPromise<T>(
  promise: Promise<T> | (() => Promise<T>)
): Promise<Result<WithoutErr<T>, RawGoogleError | OnlyErr<T>>> {
  const promiseEntry = typeof promise === 'function' ? promise() : promise

  try {
    const value = await promiseEntry
    return value instanceof Err || value instanceof Ok ? value : ok(value as any)
  } catch (_err) {
    return err(resolveGoogleAPIError(_err))
  }
}

export const mapGoogleAPIError = <
  T extends RawGoogleError,
  U extends Partial<Record<RawGoogleError['code'], ApiErrorResponse<InternalErrorCode>>> = {},
>(
  error: T,
  mapping?: U
): Err<
  never,
  Simplify<
    ValueOf<
      Omit<U, 'INTERNAL_SERVER_ERROR'> & {
        INTERNAL_SERVER_ERROR: ApiErrorResponse<typeof InternalErrorCode.INTERNAL_SERVER_ERROR>
      }
    >
  >
> => {
  const mappedError = (mapping as any)?.[error.code]

  if (mappedError) {
    return err(mappedError) as any
  }

  if (error.code in InternalErrorCode) {
    return err({
      code: error.code as InternalErrorCode,
      message: error.message,
    }) as any
  }

  return err({
    code: InternalErrorCode.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
  }) as any
}
