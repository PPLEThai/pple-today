import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { Prisma } from '@pple-today/database/prisma'
import { get_candidate_user } from '@pple-today/database/prisma/sql'
import Elysia from 'elysia'
import * as R from 'remeda'

import { CompleteOnboardingProfileBody } from './models'

import { FileServicePlugin } from '../../plugins/file'
import { PrismaServicePlugin } from '../../plugins/prisma'

export class ProfileRepository {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService
  ) {}

  async getUserRecommendation(userId: string) {
    return await fromRepositoryPromise(async () => {
      const candidateUserId = await this.prismaService.$queryRawTyped(get_candidate_user(userId))

      const candidateUser = await this.prismaService.user.findMany({
        where: {
          id: {
            in: R.pipe(
              candidateUserId,
              R.map(R.prop('user_id')),
              R.filter((id) => id !== null)
            ),
          },
        },
        select: {
          id: true,
          name: true,
          profileImagePath: true,
          responsibleArea: true,
          address: true,
        },
      })

      return candidateUser
    })
  }

  async getUserParticipation(userId: string) {
    return await fromRepositoryPromise(
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
          followers: {
            select: {
              followed: {
                select: {
                  id: true,
                  name: true,
                  profileImagePath: true,
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
      userData.profileImagePath = profileData.profile.profileImagePath
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
      userData.numberOfFollowingTopics = profileData.interestTopics.length
    }

    if (profileData.address) {
      userData.address = {
        connect: {
          province_district_subDistrict_postalCode: {
            province: profileData.address.province,
            district: profileData.address.district,
            subDistrict: profileData.address.subDistrict,
            postalCode: profileData.address.postalCode,
          },
        },
      }
    }

    return await this.updateUserProfile(userId, userData)
  }

  async updateUserProfile(userId: string, profileData: Prisma.UserUpdateArgs['data']) {
    const existingUser = await this.getProfileById(userId)
    if (existingUser.isErr()) return err(existingUser.error)

    const moveFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (tx) => {
        if (profileData.profileImagePath) {
          if (existingUser.value.profileImagePath) {
            const removeResult = await tx.bulkRemoveFile([
              existingUser.value.profileImagePath as FilePath,
            ])

            if (removeResult.isErr()) return removeResult
          }

          const moveResult = await tx.bulkMoveToPublicFolder([
            profileData.profileImagePath as FilePath,
          ])
          if (moveResult.isErr()) return moveResult

          profileData.profileImagePath = moveResult.value[0]

          return moveResult.value[0]
        }

        return null
      })
    )

    if (moveFileResult.isErr()) return err(moveFileResult.error)

    const [_, fileTx] = moveFileResult.value

    const updateResult = await fromRepositoryPromise(
      this.prismaService.user.update({
        where: { id: userId },
        include: { address: true },
        data: profileData,
      })
    )

    if (updateResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(updateResult.error)
    }

    return updateResult
  }
}

export const ProfileRepositoryPlugin = new Elysia({ name: 'ProfileRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    profileRepository: new ProfileRepository(prismaService, fileService),
  }))
