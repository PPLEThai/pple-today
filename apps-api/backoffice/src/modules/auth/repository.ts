import node from '@elysiajs/node'
import Elysia from 'elysia'

import { IntrospectAccessTokenResult } from '../../dtos/auth'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class AuthRepository {
  constructor(private prismaService: PrismaService) {}

  async getUserById(id: string) {
    return await fromPrismaPromise(
      this.prismaService.user.findUniqueOrThrow({
        where: { id },
      })
    )
  }

  async createUser(data: IntrospectAccessTokenResult) {
    const { sub, name, phone_number } = data

    return await fromPrismaPromise(
      this.prismaService.user.create({
        data: {
          id: sub,
          name,
          phoneNumber: phone_number,
        },
      })
    )
  }
}

export const AuthRepositoryPlugin = new Elysia({ name: 'AuthRepository', adapter: node() })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    authRepository: new AuthRepository(prismaService),
  }))
