import Elysia from 'elysia'

import { CompleteOnboardingProfileBody } from './models'

import { Prisma } from '../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromRepositoryPromise } from '../../utils/error'

export class ProfileRepository {
  constructor(private prismaService: PrismaService) {}

  async getRecentActivity(userId: string) {
    return await fromPrismaPromise(
      this.prismaService.poll.findMany({
        where: {
          options: {
            some: {
              pollAnswers: {
                some: {
                  userId,
                },
              },
            },
          },
        },
        distinct: ['feedItemId'],
        select: {
          title: true,
          feedItemId: true,
          options: {
            where: {
              pollAnswers: {
                some: {
                  userId,
                },
              },
            },
            select: {
              pollAnswers: {
                where: {
                  userId,
                },
                take: 1,
                orderBy: {
                  createdAt: 'desc',
                },
                select: {
                  createdAt: true,
                },
              },
            },
          },
        },
      })
    )
  }

  async getProfileById(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.user.findUniqueOrThrow({
        where: { id },
        include: {
          address: true,
        },
      })
    )
  }

  async followUser(userId: string, followedUserId: string) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction([
        this.prismaService.userFollowsUser.create({
          data: {
            followedId: followedUserId,
            followerId: userId,
          },
        }),
        this.prismaService.user.update({
          where: { id: followedUserId },
          data: {
            numberOfFollowers: {
              increment: 1,
            },
          },
        }),
        this.prismaService.user.update({
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

  async unfollowUser(userId: string, followedUserId: string) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction([
        this.prismaService.userFollowsUser.delete({
          where: {
            followedId_followerId: {
              followedId: followedUserId,
              followerId: userId,
            },
          },
        }),
        this.prismaService.user.update({
          where: { id: followedUserId },
          data: {
            numberOfFollowers: {
              decrement: 1,
            },
          },
        }),
        this.prismaService.user.update({
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

  async getFollowingUsers(userId: string) {
    return await fromRepositoryPromise(
      this.prismaService.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: {
          followings: {
            select: {
              followed: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true,
                  address: true,
                },
              },
            },
          },
        },
      })
    )
  }

  async completeOnboarding(userId: string, profileData: CompleteOnboardingProfileBody) {
    const userData: Prisma.UserUpdateArgs['data'] = {
      onBoardingCompleted: true,
    }

    if (profileData.profile) {
      userData.name = profileData.profile.name
      userData.profileImage = profileData.profile.profileImage
    }

    if (profileData.interestTopics) {
      userData.followedTopics = {
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

      await this.prismaService.address.findFirstOrThrow({
        where: {
          district: profileData.address.district,
          subDistrict: profileData.address.subDistrict,
          postalCode: profileData.address.postalCode,
          province: profileData.address.province,
        },
      })
    }

    return await this.updateUserProfile(userId, userData)
  }

  async updateUserProfile(userId: string, profileData: Prisma.UserUpdateArgs['data']) {
    return await fromRepositoryPromise(
      this.prismaService.user.update({
        where: { id: userId },
        include: { address: true },
        data: profileData,
      })
    )
  }
}

export const ProfileRepositoryPlugin = new Elysia({ name: 'ProfileRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    profileRepository: new ProfileRepository(prismaService),
  }))
