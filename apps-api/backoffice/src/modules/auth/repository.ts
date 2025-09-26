import { IntrospectAccessTokenResult } from '@pple-today/api-common/dtos'
import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class AuthRepository {
  constructor(private prismaService: PrismaService) {}

  async getUserById(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.user.findUniqueOrThrow({
        where: { id },
        include: { address: true, roles: true },
      })
    )
  }

  async createUser(data: IntrospectAccessTokenResult, roles: string[]) {
    const { sub, name, phone_number } = data

    return await fromRepositoryPromise(
      this.prismaService.user.upsert({
        where: { phoneNumber: phone_number },
        update: {
          id: sub,
          roles: {
            deleteMany: {},
            connectOrCreate: roles.map((role) => ({
              where: { userId_role: { userId: sub, role } },
              create: { role },
            })),
          },
        },
        create: {
          id: sub,
          name,
          roles: {
            connectOrCreate: roles.map((role) => ({
              where: { userId_role: { userId: sub, role } },
              create: { role },
            })),
          },
          phoneNumber: phone_number,
        },
      })
    )
  }
}

export const AuthRepositoryPlugin = new Elysia({ name: 'AuthRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    authRepository: new AuthRepository(prismaService),
  }))
