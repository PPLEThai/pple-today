import { PrismaService } from '@pple-today/api-common/services'
import { PrismaPg } from '@prisma/adapter-pg'
import Elysia from 'elysia'

import { ConfigServicePlugin } from './config'
import { ElysiaLoggerPlugin } from './log'

export const PrismaServicePlugin = new Elysia({ name: 'PrismaService' })
  .use([ConfigServicePlugin, ElysiaLoggerPlugin({ name: 'PrismaService' })])
  .decorate(({ loggerService, configService }) => {
    const connectionString = configService.get('DATABASE_URL')
    // The pool is sized explicitly: the driver default (10, waiting forever for
    // a free connection) let requests queue without bound when the database
    // slowed down, holding them open instead of failing fast.
    const adapter = new PrismaPg({
      connectionString,
      max: configService.get('DATABASE_POOL_MAX'),
      connectionTimeoutMillis: configService.get('DATABASE_POOL_CONNECTION_TIMEOUT_MS'),
    })
    const prismaService = new PrismaService(loggerService, {
      adapter,
    })

    return { prismaService }
  })
