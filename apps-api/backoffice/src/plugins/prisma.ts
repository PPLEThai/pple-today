import { PrismaPg } from '@prisma/adapter-pg'
import Elysia from 'elysia'

import { Prisma, PrismaClient } from '../../__generated__/prisma/client'

const connectionString = `${process.env.DATABASE_URL}`

class PrismaService extends PrismaClient {
  constructor(optionsArg?: Prisma.PrismaClientOptions) {
    super(optionsArg)
  }
}

const PrismaServicePlugin = new Elysia({ name: 'PrismaService' }).decorate(() => {
  const adapter = new PrismaPg({ connectionString })

  return { prismaService: new PrismaService({ adapter }) }
})

export { PrismaService, PrismaServicePlugin }
