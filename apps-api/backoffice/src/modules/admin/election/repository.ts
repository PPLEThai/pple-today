import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { ElectionType, Prisma } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import { AdminUpdateElectionBody } from './models'

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

    const filter: Prisma.ElectionWhereInput = {
      name: {
        contains: input.filter?.name,
        mode: 'insensitive',
      },
      type: input.filter?.type,
      isCancelled: input.filter?.isCancelled,
    }

    return fromRepositoryPromise(async () => {
      const [data, count] = await Promise.all([
        this.prismaService.election.findMany({
          where: filter,
          orderBy: {
            updatedAt: 'desc',
          },
          take: limit,
          skip,
        }),
        this.prismaService.election.count({
          where: filter,
        }),
      ])

      return {
        data,
        count,
      }
    })
  }

  async getElectionById(electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.election.findUniqueOrThrow({
        where: { id: electionId },
      })
    )
  }

  async updateElection(electionId: string, data: AdminUpdateElectionBody) {
    return fromRepositoryPromise(
      this.prismaService.election.update({
        where: { id: electionId },
        data: {
          name: data.name,
          description: data.description,
          location: data.location,
          type: data.type,
          isCancelled: data.isCancelled,
          publishDate: data.publishDate,
          openRegister: data.openRegister,
          closeRegister: data.closeRegister,
          openVoting: data.openVoting,
          closeVoting: data.closeVoting,
          startResult: data.startResult,
          endResult: data.endResult,
        },
      })
    )
  }

  async deleteElectionById(electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.election.delete({
        where: { id: electionId },
      })
    )
  }

  async cancelElectionById(electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        await Promise.all([
          tx.electionBallot.deleteMany({
            where: {
              electionId,
            },
          }),
          tx.electionVoteRecord.deleteMany({
            where: {
              electionId,
            },
          }),
        ])

        await tx.election.update({
          where: { id: electionId },
          data: {
            isCancelled: true,
          },
        })
      })
    )
  }
}

export const AdminElectionRepositoryPlugin = new Elysia({ name: 'AdminElectionRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    adminElectionRepository: new AdminElectionRepository(prismaService),
  }))
