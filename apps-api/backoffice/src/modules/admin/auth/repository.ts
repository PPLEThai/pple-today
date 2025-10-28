import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminAuthRepository {
  constructor(private prismaService: PrismaService) {}

  async registerUser(data: { id: string; name: string }) {
    return await fromRepositoryPromise(
      this.prismaService.adminUser.create({
        data: {
          id: data.id,
          name: data.name,
        },
      })
    )
  }

  async getUserById(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.adminUser.findUniqueOrThrow({
        where: { id },
      })
    )
  }
}

export const AdminAuthRepositoryPlugin = new Elysia({ name: 'AdminAuthRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    adminAuthRepository: new AdminAuthRepository(prismaService),
  }))
