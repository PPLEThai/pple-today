import { Err, err, fromPromise } from 'neverthrow'
import { Simplify, ValueOf } from 'type-fest'

import { ApiErrorResponse } from './error'

import { PrismaClientKnownRequestError } from '../../__generated__/prisma/runtime/client'
import { InternalErrorCode } from '../dtos/error'

/**
 * Reference for Prisma error codes
 *
 * https://www.prisma.io/docs/orm/reference/error-reference#error-codes
 */
const prismaError = {
  P2002: 'UNIQUE_CONSTRAINT_FAILED',
  P2003: 'FOREIGN_KEY_CONSTRAINT_FAILED',
  P2016: 'INVALID_INPUT',
  P2025: 'RECORD_NOT_FOUND',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

// This file contains utility functions for handling Prisma errors in a consistent manner.
export const resolvePrismaError = (error: unknown) => {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
      case 'P2003':
      case 'P2016':
      case 'P2025':
        return {
          code: prismaError[error.code],
          originalError: error,
          message: error.message,
        } as const
      default:
        return {
          originalError: error,
          code: prismaError.UNKNOWN_ERROR,
          message: error.message,
        }
    }
  }
  return {
    code: prismaError.UNKNOWN_ERROR,
    originalError: error,
    message: 'An unknown error occurred',
  }
}

export const fromPrismaPromise = <T>(promise: Promise<T> | (() => Promise<T>)) =>
  fromPromise(typeof promise === 'function' ? promise() : promise, resolvePrismaError)

type RawPrismaError = ReturnType<typeof resolvePrismaError>

export const mapRawPrismaError = <
  T extends Partial<Record<RawPrismaError['code'], ApiErrorResponse<InternalErrorCode>>> & {
    INTERNAL_SERVER_ERROR?: string
  } = {},
>(
  error: RawPrismaError,
  mapping?: T
): Err<
  never,
  Simplify<
    ValueOf<
      Omit<T, 'INTERNAL_SERVER_ERROR'> & {
        INTERNAL_SERVER_ERROR: ApiErrorResponse<typeof InternalErrorCode.INTERNAL_SERVER_ERROR>
      }
    >
  >
> => {
  const mappedError = mapping?.[error.code]

  if (mappedError) {
    return err(mappedError) as any
  }

  return err({
    code: InternalErrorCode.INTERNAL_SERVER_ERROR,
    message: mapping?.INTERNAL_SERVER_ERROR ?? 'An unexpected error occurred',
  }) as any
}
