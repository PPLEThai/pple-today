import { ElectionStatus, FilePath, ParticipationType } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { Election, Prisma, UserStatus } from '@pple-today/database/prisma'
import { get_candidate_user } from '@pple-today/database/prisma/sql'
import Elysia from 'elysia'
import * as R from 'remeda'

import { CompleteOnboardingProfileBody } from './models'

import { FileServicePlugin } from '../../plugins/file'
import { PrismaServicePlugin } from '../../plugins/prisma'

export class ProfileRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  private constructPollWithMeta<T extends { id: string }>(
    data: T[],
    config: {
      needShuffle?: boolean
      limit: number
      cursor?: string
    }
  ) {
    return {
      items: config.needShuffle ? R.shuffle(data) : data,
      meta: {
        cursor: {
          next: data.length === config.limit ? data[config.limit - 1].id : null,
          previous: config.cursor || null,
        },
      },
    }
  }

  // for readability
  private constructElectionWithMeta<T extends { electionId: string }>(
    data: T[],
    config: {
      needShuffle?: boolean
      limit: number
      cursor?: string
    }
  ) {
    return {
      items: config.needShuffle ? R.shuffle(data) : data,
      meta: {
        cursor: {
          next: data.length === config.limit ? data[config.limit - 1].electionId : null,
          previous: config.cursor || null,
        },
      },
    }
  }

  private getElectionStatus(election: Election): ElectionStatus {
    const now = new Date()

    if (now < election.openVoting) {
      return 'NOT_OPENED_VOTE'
    } else if (now < election.closeVoting) {
      return 'OPEN_VOTE'
    } else if (!election.startResult || now < election.startResult) {
      return 'CLOSED_VOTE'
    } else {
      return 'RESULT_ANNOUNCE'
    }
  }

  async getUserRecommendation(userId: string) {
    return await fromRepositoryPromise(async () => {
      const candidateUserIds = await this.prismaService.$queryRawTyped(get_candidate_user(userId))

      const candidateUser = await this.prismaService.user.findMany({
        where: {
          id: {
            in: R.pipe(
              candidateUserIds,
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

  async getProfileById(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.user.findUniqueOrThrow({
        where: { id },
        include: {
          address: true,
          roles: {
            select: {
              role: true,
            },
          },
        },
      })
    )
  }

  async followUser(userId: string, followingUserId: string) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction([
        this.prismaService.userFollowsUser.create({
          data: {
            followingId: followingUserId,
            followerId: userId,
          },
        }),
        this.prismaService.user.update({
          where: { id: followingUserId, status: UserStatus.ACTIVE },
          data: {
            numberOfFollowers: {
              increment: 1,
            },
          },
        }),
        this.prismaService.user.update({
          where: { id: userId, status: UserStatus.ACTIVE },
          data: {
            numberOfFollowing: {
              increment: 1,
            },
          },
        }),
      ])
    )
  }

  async unfollowUser(userId: string, followingUserId: string) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction([
        this.prismaService.userFollowsUser.delete({
          where: {
            followingId_followerId: {
              followerId: userId,
              followingId: followingUserId,
            },
            following: {
              status: UserStatus.ACTIVE,
            },
            follower: {
              status: UserStatus.ACTIVE,
            },
          },
        }),
        this.prismaService.user.update({
          where: { id: followingUserId },
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
              following: {
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
      userData.followingTopics = {
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
            const removeResult = await tx.bulkDeleteFile([
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

  async getUserLatestPoll({
    userId,
    cursor,
    limit,
  }: {
    userId: string
    cursor?: string
    limit: number
  }) {
    return await fromRepositoryPromise(async () => {
      const latestPoll = await this.prismaService.pollAnswer.findMany({
        where: {
          userId,
        },
        distinct: ['pollId'],
        orderBy: {
          createdAt: 'desc',
        },
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        take: limit,
        include: {
          poll: true,
        },
      })

      const transformPoll = R.pipe(
        latestPoll,
        R.map((item) => ({
          id: item.id,
          feedItemId: item.poll.feedItemId,
          type: ParticipationType.POLL,
          title: item.poll.title,
          endAt: item.poll.endAt,
          submittedAt: item.createdAt,
        }))
      )

      return this.constructPollWithMeta(transformPoll, {
        needShuffle: false,
        limit,
        cursor,
      })
    })
  }

  async getUserLatestElection({
    userId,
    cursor,
    limit,
  }: {
    userId: string
    cursor?: string //cursor by combine the user_id and election_id
    limit: number
  }) {
    return await fromRepositoryPromise(async () => {
      const latestElection = await this.prismaService.electionVoteRecord.findMany({
        where: {
          userId,
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            electionId: 'desc',
          },
          {
            userId: 'desc',
          },
        ],
        include: {
          election: true,
        },
        skip: cursor ? 1 : 0,
        cursor: cursor
          ? {
              electionId_userId: {
                electionId: cursor,
                userId,
              },
            }
          : undefined,
        take: limit,
      })

      const transformElection = R.pipe(
        latestElection,
        R.map((item) => ({
          electionId: item.election.id,
          type: ParticipationType.ELECTION,
          name: item.election.name,
          electionStatus: this.getElectionStatus(item.election),
          submittedAt: item.createdAt,
        }))
      )

      return this.constructElectionWithMeta(transformElection, {
        needShuffle: false,
        limit,
        cursor,
      })
    })
  }
}

export const ProfileRepositoryPlugin = new Elysia({ name: 'ProfileRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    profileRepository: new ProfileRepository(prismaService, fileService),
  }))
