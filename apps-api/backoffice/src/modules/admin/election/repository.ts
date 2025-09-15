import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { ElectionType } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminElectionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async listElections(input: {
    filter?: {
      name?: string
      type?: ElectionType
      isCancelled?: boolean
    }
    pagination: {
      page: number
      limit: number
    }
  }) {
    const { page, limit } = input.pagination
    const skip = Math.max((page - 1) * limit, 0)

    return fromRepositoryPromise(async () => {
      const [data, count] = await Promise.all([
        this.prismaService.election.findMany({
          where: {
            name: {
              contains: input.filter?.name,
              mode: 'insensitive',
            },
            type: input.filter?.type,
            isCancelled: input.filter?.isCancelled,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: limit,
          skip,
        }),
        this.prismaService.election.count(),
      ])

      return {
        data,
        count,
      }
    })
  }
}

export const AdminElectionRepositoryPlugin = new Elysia({ name: 'AdminElectionRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    adminElectionRepository: new AdminElectionRepository(prismaService),
  }))
