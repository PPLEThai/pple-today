import { PrismaClientKnownRequestError } from '@db/runtime/client'
import { fromPromise } from 'neverthrow'
import { match, P } from 'ts-pattern'

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
    return match(error)
      .with({ code: P.union('P2002', 'P2016', 'P2025', 'P2003') }, ({ code, message }) => ({
        originalError: error,
        code: prismaError[code],
        message,
      }))
      .otherwise(() => ({
        originalError: error,
        code: prismaError.UNKNOWN_ERROR,
        message: error.message,
      }))
  }
  return {
    code: prismaError.UNKNOWN_ERROR,
    originalError: error,
    message: 'An unknown error occurred',
  }
}

export const fromPrismaPromise = <T>(promise: Promise<T> | (() => Promise<T>)) =>
  fromPromise(typeof promise === 'function' ? promise() : promise, resolvePrismaError)
