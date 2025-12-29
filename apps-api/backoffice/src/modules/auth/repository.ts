import { IntrospectAccessTokenResult } from '@pple-today/api-common/dtos'
import { PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'
import { CommonRepository, CommonRepositoryPlugin } from '../common/repository'

export class AuthRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly commonRepository: CommonRepository
  ) {}

  async getUserById(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.user.findUniqueOrThrow({
        where: { id },
        include: { address: true, roles: true },
      })
    )
  }

  async replaceUserRoles(id: string, roles: string[]) {
    return await fromRepositoryPromise(
      this.prismaService.user.update({
        where: { id },
        data: {
          roles: {
            deleteMany: {},
            createMany: {
              data: roles.map((role) => ({ role })),
            },
          },
        },
        select: { id: true, roles: true },
      })
    )
  }

  async createUser(data: IntrospectAccessTokenResult, roles: string[]) {
    const { sub, name, phone_number } = data
    const officialUserId = await this.commonRepository.lookupOfficialUserId()

    if (officialUserId.isErr()) {
      return err(officialUserId.error)
    }

    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: sub,
            name,
            roles: {
              connectOrCreate: roles.map((role) => ({
                where: { userId_role: { userId: sub, role } },
                create: { role },
              })),
            },
            numberOfFollowing: 1,
            followers: {
              create: {
                following: {
                  connect: { id: officialUserId.value },
                },
              },
            },
            phoneNumber: phone_number,
          },
        })

        const notificationId = await tx.notificationPhoneNumber.findMany({
          where: { phoneNumber: phone_number },
          select: { notificationId: true },
        })

        await tx.userNotification.createMany({
          data: notificationId.map((n) => ({
            userId: sub,
            notificationId: n.notificationId,
          })),
          skipDuplicates: true,
        })
      })
    )
  }
}

export const AuthRepositoryPlugin = new Elysia({ name: 'AuthRepository' })
  .use([PrismaServicePlugin, CommonRepositoryPlugin])
  .decorate(({ prismaService, commonRepository }) => ({
    authRepository: new AuthRepository(prismaService, commonRepository),
  }))
