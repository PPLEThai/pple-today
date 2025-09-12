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
      this.prismaService.electionEligibleVoter.findFirstOrThrow({
        where: {
          userId,
          electionId,
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
        const voteRecord = await tx.electionVoteRecord.findFirstOrThrow({
          where: {
            electionId,
            userId,
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
}

export const ElectionRepositoryPlugin = new Elysia()
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    electionRepository: new ElectionRepository(prismaService),
  }))
