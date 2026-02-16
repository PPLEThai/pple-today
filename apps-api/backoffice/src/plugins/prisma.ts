import { PrismaService } from '@pple-today/api-common/services'
import { PrismaPg } from '@prisma/adapter-pg'
import Elysia from 'elysia'

import { ConfigServicePlugin } from './config'
import { ElysiaLoggerPlugin } from './log'

export const PrismaServicePlugin = new Elysia({ name: 'PrismaService' })
  .use([ConfigServicePlugin, ElysiaLoggerPlugin({ name: 'PrismaService' })])
  .decorate(({ loggerService, configService }) => {
    const connectionString = configService.get('DATABASE_URL')
    const adapter = new PrismaPg({ connectionString })
    const prismaService = new PrismaService(loggerService, {
      adapter,
    })

    return { prismaService }
  })
