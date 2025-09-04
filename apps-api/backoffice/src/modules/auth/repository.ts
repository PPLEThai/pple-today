import Elysia from 'elysia'

import { IntrospectAccessTokenResult } from '../../dtos/auth'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromRepositoryPromise } from '../../utils/error'

export class AuthRepository {
  constructor(private prismaService: PrismaService) {}

  async getUserById(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.user.findUniqueOrThrow({
        where: { id },
        include: { address: true },
      })
    )
  }

  async createUser(data: IntrospectAccessTokenResult, roles: string[]) {
    const { sub, name, phone_number } = data

    return await fromRepositoryPromise(
      this.prismaService.user.create({
        data: {
          id: sub,
          name,
          roles,
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
