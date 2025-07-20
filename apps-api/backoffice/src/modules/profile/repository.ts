import Elysia from 'elysia'

import { CompleteOnboardingProfileBody } from './models'

import { Prisma, UserRole } from '../../../__generated__/prisma'
import PrismaService from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

const ProfileRepository = new Elysia({ name: 'ProfileRepository' })
  .use(PrismaService)
  .decorate(({ prisma }) => ({
    profileRepository: {
      async getProfileById(id: string) {
        return await fromPrismaPromise(
          prisma.user.findUniqueOrThrow({
            where: { id },
            include: {
              address: true,
            },
          })
        )
      },

      async checkFollowableUser(userId: string) {
        return fromPrismaPromise(
          prisma.user.findUniqueOrThrow({
            where: {
              id: userId,
              role: {
                in: [UserRole.OFFICIAL, UserRole.REPRESENTATIVE],
              },
            },
          })
        )
      },

      async followUser(userId: string, followedUserId: string) {
        return await fromPrismaPromise(
          prisma.$transaction([
            prisma.followedUser.create({
              data: {
                authorId: userId,
                followedUserId,
              },
            }),
            prisma.user.update({
              where: { id: followedUserId },
              data: {
                numberOfFollowers: {
                  increment: 1,
                },
              },
            }),
            prisma.user.update({
              where: { id: userId },
              data: {
                numberOfFollowing: {
                  increment: 1,
                },
              },
            }),
          ])
        )
      },

      async unfollowUser(userId: string, followedUserId: string) {
        return await fromPrismaPromise(
          prisma.$transaction([
            prisma.followedUser.delete({
              where: {
                authorId_followedUserId: {
                  authorId: userId,
                  followedUserId,
                },
              },
            }),
            prisma.user.update({
              where: { id: followedUserId },
              data: {
                numberOfFollowers: {
                  decrement: 1,
                },
              },
            }),
            prisma.user.update({
              where: { id: userId },
              data: {
                numberOfFollowing: {
                  decrement: 1,
                },
              },
            }),
          ])
        )
      },

      async completeOnboarding(userId: string, profileData: CompleteOnboardingProfileBody) {
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

          await prisma.address.findFirstOrThrow({
            where: {
              district: profileData.address.district,
              subDistrict: profileData.address.subDistrict,
              postalCode: profileData.address.postalCode,
              province: profileData.address.province,
            },
          })
        }

        return await this.updateUserProfile(userId, userData)
      },

      async updateUserProfile(userId: string, profileData: Prisma.UserUpdateArgs['data']) {
        return await fromPrismaPromise(
          prisma.user.update({
            where: { id: userId },
            data: profileData,
          })
        )
      },
    },
  }))

export default ProfileRepository
