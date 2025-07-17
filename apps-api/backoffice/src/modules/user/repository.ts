import { prismaClient } from '../../libs/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export abstract class UserRepository {
  static async followUser(userId: string, followedUserId: string) {
    const result = await fromPrismaPromise(
      prismaClient.followedUser.create({
        data: {
          authorId: userId,
          followedUserId,
        },
      })
    )

    return result
  }

  static async unfollowUser(userId: string, followedUserId: string) {
    const result = await fromPrismaPromise(
      prismaClient.followedUser.delete({
        where: {
          authorId_followedUserId: {
            authorId: userId,
            followedUserId,
          },
        },
      })
    )

    return result
  }
}
