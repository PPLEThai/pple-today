import { IntrospectAccessTokenResult } from '../../dtos/auth'
import { prismaClient } from '../../libs/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export abstract class AuthRepository {
  static async getUserById(id: string) {
    const user = await fromPrismaPromise(
      prismaClient.user.findUniqueOrThrow({
        where: { id },
      })
    )

    return user
  }

  static async createUser(data: IntrospectAccessTokenResult) {
    const { sub, name, email } = data

    const user = await fromPrismaPromise(
      prismaClient.user.create({
        data: {
          id: sub,
          name,
          phoneNumber: email.replace('@example.com', ''),
        },
      })
    )

    return user
  }
}
