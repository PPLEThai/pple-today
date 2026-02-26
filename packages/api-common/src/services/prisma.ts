import { Prisma, PrismaClient } from '@pple-today/database/prisma'

import { ElysiaLoggerInstance } from '../plugins/logger'

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
      })
    })

    this.$on('error', (event) => {
      loggerService.error({
        message: event.message,
        timestamp: event.timestamp,
        target: event.target,
      })
    })
  }
}

export { PrismaService }
