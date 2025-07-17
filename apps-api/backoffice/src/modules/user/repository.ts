import { prismaClient } from '../../libs/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export abstract class UserRepository {
  static async checkFollowableUser(userId: string) {
    return await fromPrismaPromise(
      prismaClient.user.findUniqueOrThrow({
        where: {
          id: userId,
          role: {
            in: ['REPRESENTATIVE', 'OFFICIAL'],
          },
        },
      })
    )
  }

  static async followUser(userId: string, followedUserId: string) {
    return await fromPrismaPromise(
      prismaClient.$transaction([
        prismaClient.followedUser.create({
          data: {
            authorId: userId,
            followedUserId,
          },
        }),
        prismaClient.user.update({
          where: { id: followedUserId },
          data: {
            numberOfFollowers: {
              increment: 1,
            },
          },
        }),
        prismaClient.user.update({
          where: { id: userId },
          data: {
            numberOfFollowing: {
              increment: 1,
            },
          },
        }),
      ])
    )
  }

  static async unfollowUser(userId: string, followedUserId: string) {
    return await fromPrismaPromise(
      prismaClient.$transaction([
        prismaClient.followedUser.delete({
          where: {
            authorId_followedUserId: {
              authorId: userId,
              followedUserId,
            },
          },
        }),
        prismaClient.user.update({
          where: { id: followedUserId },
          data: {
            numberOfFollowers: {
              decrement: 1,
            },
          },
        }),
        prismaClient.user.update({
          where: { id: userId },
          data: {
            numberOfFollowing: {
              decrement: 1,
            },
          },
        }),
      ])
    )
  }
}
