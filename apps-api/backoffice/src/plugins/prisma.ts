import { ElysiaLoggerPlugin } from '@pple-today/api-common/plugins'
import { PrismaService } from '@pple-today/api-common/services'
import { PrismaPg } from '@prisma/adapter-pg'
import Elysia from 'elysia'

import { ConfigServicePlugin } from './config'

export const PrismaServicePlugin = new Elysia({ name: 'PrismaService' })
  .use([ConfigServicePlugin])
  .use((app) => {
    const configService = app.decorator.configService

    return app.use(
      ElysiaLoggerPlugin({
        name: 'PrismaService',
        transport:
          configService.get('APP_ENV') === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                },
              }
            : undefined,
      })
    )
  })
  .decorate(({ loggerService, configService }) => {
    const connectionString = configService.get('DATABASE_URL')
    const adapter = new PrismaPg({ connectionString })
    const prismaService = new PrismaService(loggerService, {
      adapter,
    })

    return { prismaService }
  })
