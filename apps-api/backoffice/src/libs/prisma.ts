import { PrismaClient } from '@db/client'
import Elysia from 'elysia'

export type WithPrisma = {
  prisma: typeof prismaClient
}

export const prismaClient = new PrismaClient()

const prismaService = new Elysia({ name: 'prismaService' }).decorate({
  prisma: prismaClient,
})

export default prismaService
