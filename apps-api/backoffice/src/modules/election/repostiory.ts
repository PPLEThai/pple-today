import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { EligibleVoterType } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class ElectionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async listMyEligibleVoters(userId: string) {
    return fromRepositoryPromise(
      this.prismaService.electionEligibleVoter.findMany({
        where: {
          userId,
        },
        include: {
          election: {
            include: {
              voters: true,
              voteRecords: true,
            },
          },
        },
      })
    )
  }

  async getMyEligibleVoter(userId: string, electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.electionEligibleVoter.findUniqueOrThrow({
        where: {
          electionId_userId: {
            userId,
            electionId,
          },
        },
        include: {
          election: {
            include: {
              voters: true,
              voteRecords: true,
              candidates: true,
            },
          },
        },
      })
    )
  }

  async updateEligibleVoterType(userId: string, electionId: string, type: EligibleVoterType) {
    return fromRepositoryPromise(
      this.prismaService.electionEligibleVoter.update({
        where: {
          electionId_userId: {
            userId,
            electionId,
          },
        },
        data: {
          type,
        },
      })
    )
  }

  async deleteMyBallot(userId: string, electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const voteRecord = await tx.electionVoteRecord.findUniqueOrThrow({
          where: {
            electionId_userId: {
              electionId,
              userId,
            },
          },
        })

        await tx.electionVoteRecord.delete({
          where: {
            electionId_userId: {
              userId,
              electionId,
            },
          },
        })

        if (voteRecord.ballotId) {
          await tx.electionBallot.delete({
            where: {
              id: voteRecord.ballotId,
            },
          })
        }
      })
    )
  }

  async createMyBallot(
    userId: string,
    electionId: string,
    encryptedBallot: string,
    faceImagePath: string,
    location: string
  ) {
    return fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const ballot = await tx.electionBallot.create({
          data: {
            electionId,
            encryptedBallot,
          },
        })

        const voteRecord = await tx.electionVoteRecord.create({
          data: {
            electionId,
            userId,
            faceImagePath,
            location,
            ballotId: ballot.id,
          },
        })

        return {
          ballot,
          voteRecord,
        }
      })
    )
  }
}

export const ElectionRepositoryPlugin = new Elysia()
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    electionRepository: new ElectionRepository(prismaService),
  }))
