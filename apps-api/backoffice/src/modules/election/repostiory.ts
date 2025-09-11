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
              voters: {
                include: {
                  ballot: true,
                },
              },
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
              voters: {
                include: {
                  ballot: true,
                },
              },
              candidates: true,
            },
          },
        },
      })
    )
  }

  async UpdateEligibleVoterType(voterId: string, type: EligibleVoterType) {
    return fromRepositoryPromise(
      this.prismaService.electionEligibleVoter.update({
        where: {
          id: voterId,
        },
        data: {
          type,
        },
      })
    )
  }
}

export const ElectionRepositoryPlugin = new Elysia()
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    electionRepository: new ElectionRepository(prismaService),
  }))
