import { PrismaClientKnownRequestError } from '@pple-today/database/prisma/runtime/client'
import { describe, expect, it } from 'vitest'

import { resolvePrismaError } from './prisma'

describe('Prisma utility', () => {
  describe('resolvePrismaError', async () => {
    it('should return a mapped error for known prisma error codes', () => {
      const knownErrors = [
        new PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '4.15.0',
        }),
        new PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: '4.15.0',
        }),
        new PrismaClientKnownRequestError('Invalid input', {
          code: 'P2016',
          clientVersion: '4.15.0',
        }),
        new PrismaClientKnownRequestError('Model not connect', {
          code: 'P2017',
          clientVersion: '4.15.0',
        }),
        new PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '4.15.0',
        }),
      ]

      const expectedOutputs = [
        {
          code: 'UNIQUE_CONSTRAINT_FAILED',
          originalError: knownErrors[0],
          message: 'Unique constraint failed',
        },
        {
          code: 'FOREIGN_KEY_CONSTRAINT_FAILED',
          originalError: knownErrors[1],
          message: 'Foreign key constraint failed',
        },
        {
          code: 'INVALID_INPUT',
          originalError: knownErrors[2],
          message: 'Invalid input',
        },
        {
          code: 'MODEL_NOT_CONNECT',
          originalError: knownErrors[3],
          message: 'Model not connect',
        },
        {
          code: 'RECORD_NOT_FOUND',
          originalError: knownErrors[4],
          message: 'Record not found',
        },
      ]

      for (let i = 0; i < knownErrors.length; i++) {
        const resolvedError = resolvePrismaError(knownErrors[i])

        expect(resolvedError).toStrictEqual(expectedOutputs[i])
      }
    })
    it('should return a default error for unknown prisma error codes', () => {
      const unknownError = new PrismaClientKnownRequestError('Unknown error', {
        code: 'P9999',
        clientVersion: '4.15.0',
      })

      const resolvedError = resolvePrismaError(unknownError)

      expect(resolvedError).toStrictEqual({
        code: 'UNKNOWN_ERROR',
        originalError: unknownError,
        message: 'Unknown error',
      })
    })
    it('should return a default error for non-prisma errors', () => {
      const nonPrismaError = new Error('Some random error')

      const resolvedError = resolvePrismaError(nonPrismaError)

      expect(resolvedError).toStrictEqual({
        code: 'UNKNOWN_ERROR',
        originalError: nonPrismaError,
        message: 'An unknown error occurred',
      })
    })
  })
})
