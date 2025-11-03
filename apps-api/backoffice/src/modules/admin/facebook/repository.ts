import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  GetFacebookPageByIdResponse,
  GetFacebookPagesQuery,
  GetFacebookPagesResponse,
  UpdateFacebookPageBody,
} from './models'

import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminFacebookPageRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getFacebookPages(query: GetFacebookPagesQuery = { limit: 10, page: 1 }) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    const where = {
      ...(query.search && {
        name: {
          contains: query.search,
          mode: 'insensitive' as const,
        },
      }),
      ...(query.status &&
        query.status.length > 0 && {
          status: {
            in: query.status,
          },
        }),
    }

    return fromRepositoryPromise(async () => {
      const [data, count] = await Promise.all([
        this.prismaService.facebookPage.findMany({
          select: {
            id: true,
            name: true,
            manager: {
              select: {
                numberOfFollowers: true,
              },
            },
            linkedStatus: true,
          },
          take: limit,
          skip,
          orderBy: {
            createdAt: 'desc',
          },
          where,
        }),
        this.prismaService.facebookPage.count({
          where,
        }),
      ])

      return {
        items: data.map(({ manager, ...facebookPageData }) => ({
          ...facebookPageData,
          numberOfFollowers: manager?.numberOfFollowers,
        })),
        meta: { count },
      } satisfies GetFacebookPagesResponse
    })
  }

  async getFacebookPageById(facebookPageId: string) {
    return await fromRepositoryPromise(async () => {
      const { manager, ...result } = await this.prismaService.facebookPage.findUniqueOrThrow({
        where: { id: facebookPageId },
        select: {
          id: true,
          name: true,
          manager: {
            select: {
              numberOfFollowers: true,
              id: true,
              name: true,
              profileImagePath: true,
            },
          },
          linkedStatus: true,
          createdAt: true,
        },
      })

      return {
        ...result,
        numberOfFollowers: manager?.numberOfFollowers,
        ...(manager && {
          user: {
            id: manager.id,
            name: manager.name,
            profileImagePath: manager.profileImagePath,
          },
        }),
      } satisfies GetFacebookPageByIdResponse
    })
  }

  async updateFacebookPageById(facebookPageId: string, data: UpdateFacebookPageBody) {
    return await fromRepositoryPromise(
      this.prismaService.facebookPage.update({
        where: { id: facebookPageId },
        data: {
          name: data.name,
        },
      })
    )
  }
}

export const AdminFacebookPageRepositoryPlugin = new Elysia({ name: 'AdminFacebookPageRepository' })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    facebookPageRepository: new AdminFacebookPageRepository(prismaService),
  }))
