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
