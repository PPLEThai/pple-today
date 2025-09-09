import { PrismaClientKnownRequestError } from '@pple-today/database/prisma/runtime/client'

/**
 * Reference for Prisma error codes
 *
 * https://www.prisma.io/docs/orm/reference/error-reference#error-codes
 */
const prismaError = {
  P2002: 'UNIQUE_CONSTRAINT_FAILED',
  P2003: 'FOREIGN_KEY_CONSTRAINT_FAILED',
  P2016: 'INVALID_INPUT',
  P2017: 'MODEL_NOT_CONNECT',
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
      case 'P2017':
        return {
          code: prismaError[error.code],
          originalError: error,
          message: error.message,
        } as const
      default:
        return {
          code: prismaError.UNKNOWN_ERROR,
          originalError: error,
          message: error.message,
        } as const
    }
  }
  return {
    code: prismaError.UNKNOWN_ERROR,
    originalError: error,
    message: 'An unknown error occurred',
  } as const
}

export type RawPrismaError = ReturnType<typeof resolvePrismaError>
