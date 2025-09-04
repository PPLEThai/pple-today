import { Prisma, PrismaClient } from '@pple-today/database/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import Elysia from 'elysia'

import { ElysiaLoggerInstance, ElysiaLoggerPlugin } from './logger'

class PrismaService extends PrismaClient<
  Prisma.PrismaClientOptions,
  'query' | 'error' | 'warn' | 'info'
> {
  constructor(loggerService: ElysiaLoggerInstance, optionsArg?: Prisma.PrismaClientOptions) {
    super({
      ...optionsArg,
      errorFormat: 'minimal',
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    })

    this.$on('warn', (event) => {
      loggerService.warn({
        message: event.message,
        timestamp: event.timestamp,
        target: event.target,
        stackTrace: new Error().stack,
      })
    })

    this.$on('error', (event) => {
      loggerService.error({
        message: event.message,
        timestamp: event.timestamp,
        target: event.target,
        stackTrace: new Error().stack,
      })
    })
  }
}

const PrismaServicePlugin = new Elysia({ name: 'PrismaService' })
  .use(ElysiaLoggerPlugin({ name: 'PrismaService' }))
  .decorate(({ loggerService }) => {
    const connectionString = `${process.env.DATABASE_URL}`
    const adapter = new PrismaPg({ connectionString })
    const prismaService = new PrismaService(loggerService, {
      adapter,
    })

    return { prismaService }
  })

export { PrismaService, PrismaServicePlugin }
