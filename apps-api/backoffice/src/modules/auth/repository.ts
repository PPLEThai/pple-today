import { IntrospectAccessTokenResult } from '@pple-today/api-common/dtos'
import { PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

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

  async checkUserHasRole(userId: string, roles: string[]) {
    const userRole = await fromRepositoryPromise(
      this.prismaService.userRole.findMany({
        where: { userId, role: { in: roles } },
      })
    )

    if (userRole.isErr()) return err(userRole.error)

    return ok(userRole.value.length > 0)
  }

  async createUser(data: IntrospectAccessTokenResult, roles: string[]) {
    const { sub, name, phone_number } = data

    return await fromRepositoryPromise(
      this.prismaService.user.create({
        data: {
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
