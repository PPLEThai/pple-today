import { FileService, PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { GetUsersQuery, GetUsersResponse } from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminUserRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async getUsers(query: GetUsersQuery = { limit: 10, page: 1 }) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    const where = {
      ...(query.search && {
        name: {
          contains: query.search,
          mode: 'insensitive' as const,
        },
      }),
      ...(query.roles &&
        query.roles.length > 0 && {
          roles: {
            some: {
              role: { in: query.roles },
            },
          },
        }),
    }

    return fromRepositoryPromise(async () => {
      const [data, count] = await Promise.all([
        this.prismaService.user.findMany({
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            roles: {
              select: {
                role: true,
              },
            },
            status: true,
          },
          take: limit,
          skip,
          orderBy: {
            createdAt: 'desc',
          },
          where,
        }),
        this.prismaService.user.count({
          where,
        }),
      ])

      return {
        users: data.map(({ roles, ...userData }) => ({
          ...userData,
          roles: roles.map(({ role }) => role),
        })),
        meta: { count },
      } satisfies GetUsersResponse
    })
  }
}

export const AdminUserRepositoryPlugin = new Elysia({ name: 'AdminUserRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    userRepository: new AdminUserRepository(prismaService, fileService),
  }))
