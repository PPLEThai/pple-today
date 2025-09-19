import { t } from 'elysia'
import { Err, err as defaultErr } from 'neverthrow'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createErrorSchema, err, tApiError } from './error'

import { InternalErrorCode, InternalErrorCodeSchemas } from '../dtos'

describe('Error utility', () => {
  describe('tApiError', () => {
    beforeAll(() => {
      ;(InternalErrorCodeSchemas as any).TEST_DATA = {
        status: 400,
        data: t.Object({
          testField: t.String(),
        }),
      }
    })

    afterAll(() => {
      delete (InternalErrorCodeSchemas as any).TEST_DATA
    })

    it('should create a valid API error schema', () => {
      const error = tApiError(InternalErrorCode.BAD_REQUEST)
      expect(error).toEqual(
        t.Object({
          code: t.Literal(InternalErrorCode.BAD_REQUEST),
          message: t.Optional(t.String()),
          data: t.Optional(t.Unknown()),
        })
      )
    })

    it('should create a valid API error schema with data', () => {
      const error = tApiError('TEST_DATA' as any)
      expect(error).toEqual(
        t.Object({
          code: t.Literal('TEST_DATA'),
          message: t.Optional(t.String()),
          data: t.Object({
            testField: t.String(),
          }),
        })
      )
    })
  })

  describe('tApiErrorResponse', () => {
    beforeAll(() => {
      ;(InternalErrorCodeSchemas as any).TEST_DATA = {
        status: 400,
        data: t.Object({
          testField: t.String(),
        }),
      }
    })

    afterAll(() => {
      delete (InternalErrorCodeSchemas as any).TEST_DATA
    })

    it('should create a valid API error response schema', () => {
      const errorResponse = createErrorSchema(InternalErrorCode.BAD_REQUEST)
      expect(errorResponse).toEqual({
        400: t.Object({
          error: t.Union([
            t.Object({
              code: t.Literal(InternalErrorCode.BAD_REQUEST),
              message: t.Optional(t.String()),
              data: t.Optional(t.Unknown()),
            }),
          ]),
        }),
      })
    })

    it('should create a valid API error response schema with multiple errors', () => {
      const errorResponse = createErrorSchema(
        InternalErrorCode.BAD_REQUEST,
        InternalErrorCode.UNAUTHORIZED,
        'TEST_DATA' as any
      )
      expect(errorResponse).toEqual({
        400: t.Object({
          error: t.Union([
            t.Object({
              code: t.Literal(InternalErrorCode.BAD_REQUEST),
              message: t.Optional(t.String()),
              data: t.Optional(t.Unknown()),
            }),
            t.Object({
              code: t.Literal('TEST_DATA'),
              message: t.Optional(t.String()),
              data: t.Object({
                testField: t.String(),
              }),
            }),
          ]),
        }),
        401: t.Object({
          error: t.Union([
            t.Object({
              code: t.Literal(InternalErrorCode.UNAUTHORIZED),
              message: t.Optional(t.String()),
              data: t.Optional(t.Unknown()),
            }),
          ]),
        }),
      })
    })
  })

  describe('createErrorSchema', () => {
    it('should group error schemas by their status codes', () => {
      const testcases = [
        {
          input: [
            InternalErrorCode.ABOUT_US_NOT_FOUND,
            InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
            InternalErrorCode.BAD_REQUEST,
            InternalErrorCode.UNAUTHORIZED,
          ],
          output: {
            400: t.Object({
              error: t.Union([tApiError(InternalErrorCode.BAD_REQUEST)]),
            }),
            401: t.Object({
              error: t.Union([tApiError(InternalErrorCode.UNAUTHORIZED)]),
            }),
            404: t.Object({
              error: t.Union([
                tApiError(InternalErrorCode.ABOUT_US_NOT_FOUND),
                tApiError(InternalErrorCode.ANNOUNCEMENT_NOT_FOUND),
              ]),
            }),
          },
        },
        {
          input: [
            InternalErrorCode.FORBIDDEN,
            InternalErrorCode.INTERNAL_SERVER_ERROR,
            InternalErrorCode.VALIDATION_ERROR,
          ],
          output: {
            403: t.Object({
              error: t.Union([tApiError(InternalErrorCode.FORBIDDEN)]),
            }),
            422: t.Object({ error: t.Union([tApiError(InternalErrorCode.VALIDATION_ERROR)]) }),
            500: t.Object({ error: t.Union([tApiError(InternalErrorCode.INTERNAL_SERVER_ERROR)]) }),
          },
        },
        {
          input: [],
          output: {},
        },
        {
          input: [
            InternalErrorCode.TOPIC_CANNOT_FOLLOW_DRAFT,
            InternalErrorCode.TOPIC_ALREADY_FOLLOWED,
            InternalErrorCode.TOPIC_CANNOT_FOLLOW_DRAFT,
          ],
          output: {
            409: t.Object({
              error: t.Union([
                tApiError(InternalErrorCode.TOPIC_CANNOT_FOLLOW_DRAFT),
                tApiError(InternalErrorCode.TOPIC_ALREADY_FOLLOWED),
                tApiError(InternalErrorCode.TOPIC_CANNOT_FOLLOW_DRAFT),
              ]),
            }),
          },
        },
      ]

      for (const testcase of testcases) {
        const result = createErrorSchema(...(testcase.input as any))
        expect(result).toStrictEqual(testcase.output)
      }
    })
  })

  describe('err', () => {
    it('should create an Err object', () => {
      const error = {
        message: 'Test error',
        code: InternalErrorCode.BAD_REQUEST,
      }
      const result = err(error)

      expect(result).toBeInstanceOf(Err)
      expect(result.error).toBe(error)
      expect(result.error).toHaveProperty('stack')
    })

    it('should not override stack if already present', () => {
      const error = new Error('Test error with stack')
      error.stack = 'Custom stack trace'
      const result = err(error)

      expect(result.error.stack).toBe('Custom stack trace')
    })

    it('should handle Err objects correctly', () => {
      const errorBody = new Error('Test error body')

      const originalErr = defaultErr(errorBody)
      const result = err(originalErr)

      expect(result.error).toBe(errorBody)
    })
  })
})
