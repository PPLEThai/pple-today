import { t } from 'elysia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockedConfigDotenv = vi.fn()

vi.mock('dotenv', () => ({
  configDotenv: mockedConfigDotenv,
}))

describe('Config Plugin', async () => {
  const { ConfigService } = await import('./config')

  beforeEach(() => {
    mockedConfigDotenv.mockClear()
    process.env = {}
  })

  describe('ConfigService class', () => {
    it('should initialize with correct parameters', () => {
      process.env = {
        TEST: 'test_value',
      }

      const configService = new ConfigService({
        schema: t.Object({
          TEST: t.String(),
        }),
        autoLoadEnv: false,
      })

      expect(configService).toBeDefined()
      expect(configService.get('TEST')).toBe('test_value')
    })

    it('should load environment variables when autoLoadEnv is true', () => {
      new ConfigService({
        schema: t.Object({}),
        autoLoadEnv: true,
      })

      expect(mockedConfigDotenv).toHaveBeenCalled()
    })

    it('should throw an error if environment variables do not match the schema', () => {
      expect(() => {
        process.env = {
          TEST: 'not_a_number',
        }
        new ConfigService({
          schema: t.Object({
            TEST: t.Number(), // Expecting a number here
          }),
          autoLoadEnv: false,
        })
      }).toThrow()
    })

    it('should return undefined for missing environment variables', () => {
      const configService = new ConfigService({
        schema: t.Object({
          TEST: t.String({ default: 'default_value' }),
        }),
        autoLoadEnv: false,
      })

      expect(configService.get('TEST2' as any)).toBe(undefined)
    })
  })
})
