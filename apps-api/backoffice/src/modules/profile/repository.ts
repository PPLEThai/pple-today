import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, FileTransactionService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { Prisma } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import { CompleteOnboardingProfileBody } from './models'

import { FileServicePlugin } from '../../plugins/file'
import { PrismaServicePlugin } from '../../plugins/prisma'

export class ProfileRepository {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService
  ) {}

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
    let globalFileTx: FileTransactionService | null = null
    if (profileData.profileImage) {
      const moveFileResult = await fromRepositoryPromise(
        this.fileService.$transaction(async (tx) => {
          const moveResult = await tx.bulkMoveToPublicFolder([profileData.profileImage as FilePath])
          if (moveResult.isErr()) return moveResult

          return moveResult.value[0]
        })
      )

      if (moveFileResult.isErr()) return err(moveFileResult.error)

      const [publicFile, fileTx] = moveFileResult.value
      profileData.profileImage = publicFile

      globalFileTx = fileTx
    }

    const updateResult = await fromRepositoryPromise(
      this.prismaService.user.update({
        where: { id: userId },
        include: { address: true },
        data: profileData,
      })
    )

    if (updateResult.isErr()) {
      if (globalFileTx) {
        const rollbackResult = await globalFileTx.rollback()
        if (rollbackResult.isErr()) return err(rollbackResult.error)
      }
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
