import { FileService, PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  GetUserByIdParams,
  GetUserByIdResponse,
  GetUsersQuery,
  GetUsersResponse,
  UpdateUserBody,
  UpdateUserParams,
} from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export const KNOWN_ROLES = [
  'pple-ad:tto',
  'pple-ad:candidate',
  'pple-ad:foundation',
  'pple-ad:hq',
  'pple-ad:local',
  'pple-ad:mp',
  'pple-ad:mp_assistant',
  'pple-ad:province',
  'pple-member:membership_permanant',
  'pple-member:membership_yearly',
  'official',
]

export class AdminUserRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async getUsers(query: GetUsersQuery = { limit: 10, page: 1 }) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    let roleFilter = {}
    if (query.roles && query.roles.length > 0) {
      const knownQueryRoles = query.roles.filter((role) => KNOWN_ROLES.includes(role))
      if (knownQueryRoles.length === 0) {
        roleFilter = {
          roles: {
            some: { role: { notIn: KNOWN_ROLES } },
          },
        }
      } else if (query.roles.length === knownQueryRoles.length) {
        roleFilter = {
          roles: {
            some: { role: { in: knownQueryRoles } },
          },
        }
      } else {
        roleFilter = {
          roles: {
            some: {
              OR: [{ role: { in: knownQueryRoles } }, { role: { notIn: KNOWN_ROLES } }],
            },
          },
        }
      }
    }

    const where = {
      ...(query.search && {
        name: {
          contains: query.search,
          mode: 'insensitive' as const,
        },
      }),
      ...roleFilter,
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

  async getUserById(userId: GetUserByIdParams['userId']) {
    return fromRepositoryPromise(async () => {
      const { roles, profileImagePath, ...data } = await this.prismaService.user.findUniqueOrThrow({
        where: { id: userId },
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
          profileImagePath: true,
          responsibleArea: true,
        },
      })

      return {
        ...data,
        roles: roles.map(({ role }) => role),
        profileImage: profileImagePath
          ? this.fileService.getPublicFileUrl(profileImagePath)
          : undefined,
      } satisfies GetUserByIdResponse
    })
  }

  async updateUserById(userId: UpdateUserParams['userId'], data: UpdateUserBody) {
    // FIXME: Handle Profile Image Change
    return await fromRepositoryPromise(
      this.prismaService.user.update({ where: { id: userId }, data })
    )
  }
}

export const AdminUserRepositoryPlugin = new Elysia({ name: 'AdminUserRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    userRepository: new AdminUserRepository(prismaService, fileService),
  }))
