import { InternalErrorCode, IntrospectAccessTokenResult } from '@pple-today/api-common/dtos'
import { PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class AuthRepository {
  private OFFICIAL_USER_ID: string = ''

  constructor(private readonly prismaService: PrismaService) {}

  private async lookupOfficialUserId() {
    if (this.OFFICIAL_USER_ID) {
      return ok(this.OFFICIAL_USER_ID)
    }

    const findOfficialResult = await fromRepositoryPromise(
      this.prismaService.userRole.findFirst({
        where: { role: 'official' },
        select: { user: { select: { id: true } } },
      })
    )

    if (findOfficialResult.isErr()) {
      return err(findOfficialResult.error)
    }

    if (!findOfficialResult.value) {
      return err({
        message: 'Official user not found',
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
      })
    }

    this.OFFICIAL_USER_ID = findOfficialResult.value.user.id
    return ok(this.OFFICIAL_USER_ID)
  }

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
    const officialUserId = await this.lookupOfficialUserId()

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
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    authRepository: new AuthRepository(prismaService),
  }))
