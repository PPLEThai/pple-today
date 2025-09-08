import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
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
                  bollot: true,
                },
              },
            },
          },
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
