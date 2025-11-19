import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class HealthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async checkDatabaseConnection(): Promise<boolean> {
    const result = await fromRepositoryPromise(this.prismaService.$queryRaw`SELECT 1 as result`)
    return result.isOk()
  }
}

export const HealthRepositoryPlugin = new Elysia({
  name: 'HealthRepository',
})
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    healthRepository: new HealthRepository(prismaService),
  }))
