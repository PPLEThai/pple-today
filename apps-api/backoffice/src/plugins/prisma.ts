import { PrismaPg } from '@prisma/adapter-pg'
import Elysia from 'elysia'

import { PrismaClient } from '../../__generated__/prisma/client'

const connectionString = `${process.env.DATABASE_URL}`

const PrismaService = new Elysia({ name: 'PrismaService' }).decorate(() => {
  const adapter = new PrismaPg({ connectionString })
  const prismaClient = new PrismaClient({
    adapter,
  })

  return { prisma: prismaClient }
})

export default PrismaService
