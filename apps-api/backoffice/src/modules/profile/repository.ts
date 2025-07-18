import { CompleteOnboardingProfileBody } from './models'

import { Prisma, UserRole } from '../../../__generated__/prisma'
import { prismaClient } from '../../libs/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export abstract class UserRepository {
  static async getUserById(id: string) {
    const user = await fromPrismaPromise(
      prismaClient.user.findUniqueOrThrow({
        where: { id },
        include: {
          address: true,
        },
      })
    )

    return user
  }

  static async checkFollowableUser(userId: string) {
    return await fromPrismaPromise(
      prismaClient.user.findUniqueOrThrow({
        where: {
          id: userId,
          role: {
            in: [UserRole.OFFICIAL, UserRole.REPRESENTATIVE],
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

  static async completeOnboarding(userId: string, profileData: CompleteOnboardingProfileBody) {
    const userData: Prisma.UserUpdateArgs['data'] = {
      onBoardingCompleted: true,
    }

    if (profileData.profile) {
      userData.name = profileData.profile.name
      userData.profileImage = profileData.profile.profileImage
    }

    if (profileData.interestTopics) {
      userData.followingTopics = {
        createMany: {
          data:
            profileData.interestTopics.map((topic) => ({
              topicId: topic,
            })) || [],
        },
      }
    }

    if (profileData.address) {
      userData.address = {
        connect: {
          district_subDistrict: {
            district: profileData.address.district,
            subDistrict: profileData.address.subDistrict,
          },
        },
      }

      await prismaClient.address.findFirstOrThrow({
        where: {
          district: profileData.address.district,
          subDistrict: profileData.address.subDistrict,
          postalCode: profileData.address.postalCode,
          province: profileData.address.province,
        },
      })
    }

    return await UserRepository.updateUserProfile(userId, userData)
  }

  static async updateUserProfile(userId: string, profileData: Prisma.UserUpdateArgs['data']) {
    return await fromPrismaPromise(
      prismaClient.user.update({
        where: { id: userId },
        data: profileData,
      })
    )
  }
}
