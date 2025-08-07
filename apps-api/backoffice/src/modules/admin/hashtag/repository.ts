import Elysia from 'elysia'

import { CreateHashtagBody } from './models'

import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

export class AdminHashtagRepository {
  constructor(private prismaService: PrismaService) {}

  async getHashtags(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = Math.max((page - 1) * limit, 0)

    return fromPrismaPromise(
      this.prismaService.hashTag.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        take: limit,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
      })
    )
  }

  async getHashtagById(hashtagId: string) {
    return await fromPrismaPromise(
      this.prismaService.hashTag.findUniqueOrThrow({
        where: { id: hashtagId },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    )
  }

  async createHashtag(data: PutHashtagBody) {
    return await fromPrismaPromise(
      this.prismaService.hashTag.create({
        data: {
          name: data.name,
          status: data.status,
        },
      })
    )
  }

  async updateHashtagById(hashtagId: string, data: PutHashtagBody) {
    return await fromPrismaPromise(
      this.prismaService.hashTag.update({
        where: { id: hashtagId },
        data: {
          name: data.name,
          status: data.status,
        },
      })
    )
  }

  async deleteHashtagById(hashtagId: string) {
    return await fromPrismaPromise(
      this.prismaService.hashTag.delete({
        where: { id: hashtagId },
      })
    )
  }
}

export const AdminHashtagRepositoryPlugin = new Elysia({
  name: 'AdminHashtagRepository',
})
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    adminHashtagRepository: new AdminHashtagRepository(prismaService),
  }))
