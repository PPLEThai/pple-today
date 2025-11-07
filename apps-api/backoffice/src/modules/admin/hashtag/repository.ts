import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { CreateHashtagBody, GetHashtagsQuery, UpdateHashtagBody } from './models'

import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminHashtagRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getHashtags(query: GetHashtagsQuery = { page: 1 }) {
    const { limit, page } = query
    const skip = limit !== undefined ? Math.max((page - 1) * limit, 0) : 0

    return fromRepositoryPromise(async () => {
      const [data, count] = await Promise.all([
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
          ...(query.search && {
            where: {
              name: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          }),
        }),
        this.prismaService.hashTag.count({
          ...(query.search && {
            where: {
              name: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          }),
        }),
      ])

      return { data, meta: { count } }
    })
  }

  async getHashtagById(hashtagId: string) {
    return await fromRepositoryPromise(
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

  async createHashtag(data: CreateHashtagBody) {
    return await fromRepositoryPromise(
      this.prismaService.hashTag.create({
        data: {
          name: data.name,
        },
      })
    )
  }

  async updateHashtagById(hashtagId: string, data: UpdateHashtagBody) {
    return await fromRepositoryPromise(
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
    return await fromRepositoryPromise(
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
