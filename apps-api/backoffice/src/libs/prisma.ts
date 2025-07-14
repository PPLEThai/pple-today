import { PrismaPg } from '@prisma/adapter-pg'
import Elysia from 'elysia'

import { PrismaClient } from '../../__generated__/prisma/client'

export type WithPrisma = {
  prisma: typeof prismaClient
}

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
export const prismaClient = new PrismaClient({
  adapter,
})

const prismaService = new Elysia({ name: 'prismaService' }).decorate({
  prisma: prismaClient,
})

export default prismaService
