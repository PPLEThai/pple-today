import Elysia from 'elysia'

import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'

export class ElectionRepository {
  constructor(private readonly prismaService: PrismaService) {}
}

export const ElectionRepositoryPlugin = new Elysia()
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    electionRepository: new ElectionRepository(prismaService),
  }))
