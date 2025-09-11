import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { Prisma } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import { CompleteOnboardingProfileBody } from './models'

import { BigQueryClient, BigQueryClientPlugin } from '../../plugins/big-query'
import { ConfigServicePlugin } from '../../plugins/config'
import { FileServicePlugin } from '../../plugins/file'
import { PrismaServicePlugin } from '../../plugins/prisma'

export class ProfileRepository {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService,
    private bigQueryClient: BigQueryClient,
    private recommendationConfig: {
      profileModelName: string
    }
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
        if (profileData.profileImage) {
          if (existingUser.value.profileImage) {
            const removeResult = await tx.bulkRemoveFile([
              existingUser.value.profileImage as FilePath,
            ])

            if (removeResult.isErr()) return removeResult
          }

          const moveResult = await tx.bulkMoveToPublicFolder([profileData.profileImage as FilePath])
          if (moveResult.isErr()) return moveResult

          profileData.profileImage = moveResult.value[0]

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

  async getProfileSuggestion(currentUserId: string) {
    return fromRepositoryPromise(async () => {
      const result = await this.bigQueryClient.createQueryJob({
        query: `
            SELECT following_user_id
            FROM ML.RECOMMEND(MODEL \`${this.recommendationConfig.profileModelName}\`, (
              SELECT "@userId" AS user_id
            )) ORDER BY predicted_rating_confidence DESC
          `,
        params: {
          userId: currentUserId,
        },
      })

      const job = result[0]
      const [rawUserIds] = await job.getQueryResults()

      const userIds: string[] = rawUserIds.map(({ following_user_id }) => following_user_id)

      const users = await this.prismaService.user.findMany({
        where: {
          id: {
            in: userIds,
          },
          followings: {
            every: {
              followerId: {
                not: currentUserId,
              },
            },
          },
        },
        take: 50,
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      })

      return users
    })
  }
}

export const ProfileRepositoryPlugin = new Elysia({ name: 'ProfileRepository' })
  .use([PrismaServicePlugin, FileServicePlugin, BigQueryClientPlugin, ConfigServicePlugin])
  .decorate(({ prismaService, fileService, bigQueryClient, configService }) => ({
    profileRepository: new ProfileRepository(prismaService, fileService, bigQueryClient, {
      profileModelName: configService.get('GCP_BIGQUERY_PROFILE_MODEL_NAME'),
    }),
  }))
