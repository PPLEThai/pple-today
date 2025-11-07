import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

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

export const KNOWN_ROLES_EXCEPT_OFFICIAL = [
  'pple-ad:tto',
  'pple-ad:candidate',
  'pple-ad:foundation',
  'pple-ad:hq',
  'pple-ad:local',
  'pple-ad:mp',
  'pple-ad:mp_assistant',
  'pple-ad:province',
  'pple-member:membership_permanent',
  'pple-member:membership_yearly',
]

export class AdminUserRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async getUsers(query: GetUsersQuery = { limit: 10, page: 1 }) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    const whitelistedRoles = query.roles ? query.roles.filter((role) => role !== 'official') : []

    let roleFilter: object = {
      roles: {
        none: { role: 'official' },
      },
    }
    if (whitelistedRoles.length > 0) {
      const knownQueryRoles = whitelistedRoles.filter((role) =>
        KNOWN_ROLES_EXCEPT_OFFICIAL.includes(role)
      )
      if (knownQueryRoles.length === 0) {
        roleFilter = {
          roles: {
            none: { role: 'official' },
            some: { role: { notIn: KNOWN_ROLES_EXCEPT_OFFICIAL } },
          },
        }
      } else if (whitelistedRoles.length === knownQueryRoles.length) {
        roleFilter = {
          roles: {
            none: { role: 'official' },
            some: { role: { in: knownQueryRoles } },
          },
        }
      } else {
        roleFilter = {
          roles: {
            none: { role: 'official' },
            some: {
              OR: [
                { role: { in: knownQueryRoles } },
                { role: { notIn: KNOWN_ROLES_EXCEPT_OFFICIAL } },
              ],
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
        where: { id: userId, roles: { none: { role: 'official' } } },
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
    const existingUser = await fromRepositoryPromise(
      this.prismaService.user.findUniqueOrThrow({
        where: { id: userId, roles: { none: { role: 'official' } } },
        select: { profileImagePath: true },
      })
    )
    if (existingUser.isErr()) return err(existingUser.error)

    const updateFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        if (!data.profileImage || existingUser.value.profileImagePath === data.profileImage)
          return existingUser.value.profileImagePath

        if (existingUser.value.profileImagePath) {
          const deleteResult = await fileTx.deleteFile(
            existingUser.value.profileImagePath as FilePath
          )
          if (deleteResult.isErr()) return deleteResult
        }

        const moveResult = await fileTx.bulkMoveToPublicFolder([data.profileImage])
        if (moveResult.isErr()) return moveResult
        return moveResult.value[0]
      })
    )
    if (updateFileResult.isErr()) return err(updateFileResult.error)

    const [newImageFilePath, fileTx] = updateFileResult.value
    const updateResult = await fromRepositoryPromise(
      this.prismaService.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          status: data.status,
          profileImagePath: newImageFilePath,
        },
      })
    )

    if (updateResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(updateResult.error)
    }

    return ok(updateResult.value)
  }
}

export const AdminUserRepositoryPlugin = new Elysia({ name: 'AdminUserRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    userRepository: new AdminUserRepository(prismaService, fileService),
  }))
