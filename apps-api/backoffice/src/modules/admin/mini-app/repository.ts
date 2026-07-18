import { FileService, PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { CreateMiniAppBody, UpdateMiniAppBody } from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export type CreateMiniAppData = Omit<CreateMiniAppBody, 'createZitadelApp' | 'clientId'> & {
  clientId: string
}

export class AdminMiniAppRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async findMiniAppSource(id: string) {
    return fromRepositoryPromise(
      this.prismaService.miniApp.findUniqueOrThrow({
        where: { id },
        select: { source: true },
      })
    )
  }

  async getMiniApps() {
    return fromRepositoryPromise(
      this.prismaService.miniApp.findMany({
        include: {
          miniAppRoles: true,
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      })
    )
  }

  async createMiniApp(data: CreateMiniAppData) {
    const moveFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        if (!data.iconFilePath) return null
        const moveResult = await fileTx.bulkMoveToPublicFolder([data.iconFilePath])
        if (moveResult.isErr()) return moveResult
        return moveResult.value[0]
      })
    )
    if (moveFileResult.isErr()) return err(moveFileResult.error)
    const [newIconPath, fileTx] = moveFileResult.value

    const createResult = await fromRepositoryPromise(
      this.prismaService.miniApp.create({
        data: {
          name: data.name,
          slug: data.slug,
          clientUrl: data.url,
          clientId: data.clientId,
          requiresAuth: data.requiresAuth,
          icon: newIconPath ? this.fileService.getPublicFileUrl(newIconPath) : undefined,
          order: data.order,
          miniAppRoles: data.roles
            ? {
                createMany: {
                  data: data.roles.map((role) => ({ role })),
                },
              }
            : undefined,
        },
        include: {
          miniAppRoles: true,
        },
      })
    )

    if (createResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(createResult.error)
    }

    return ok(createResult.value)
  }

  async updateMiniApp(id: string, data: UpdateMiniAppBody) {
    const existingMiniApp = await fromRepositoryPromise(
      this.prismaService.miniApp.findUniqueOrThrow({
        where: { id },
        select: { icon: true },
      })
    )
    if (existingMiniApp.isErr()) return err(existingMiniApp.error)

    const moveFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        if (!data.iconFilePath) return null

        // Only delete the previous icon when it is a file we host; legacy rows
        // may still hold a base64 data URI or an external URL.
        const oldIconPath = existingMiniApp.value.icon
          ? this.fileService.getFilePathFromPublicUrl(existingMiniApp.value.icon)
          : null
        if (oldIconPath) {
          const deleteResult = await fileTx.deleteFile(oldIconPath)
          if (deleteResult.isErr()) return deleteResult
        }

        const moveResult = await fileTx.bulkMoveToPublicFolder([data.iconFilePath])
        if (moveResult.isErr()) return moveResult
        return moveResult.value[0]
      })
    )
    if (moveFileResult.isErr()) return err(moveFileResult.error)
    const [newIconPath, fileTx] = moveFileResult.value

    const updateResult = await fromRepositoryPromise(
      this.prismaService.miniApp.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          clientUrl: data.url,
          clientId: data.clientId,
          requiresAuth: data.requiresAuth,
          icon: newIconPath ? this.fileService.getPublicFileUrl(newIconPath) : undefined,
          order: data.order,
          miniAppRoles: data.roles
            ? {
                deleteMany: {},
                createMany: {
                  data: data.roles.map((role) => ({ role })),
                },
              }
            : undefined,
        },
        include: {
          miniAppRoles: true,
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

  async deleteMiniApp(id: string) {
    const existingMiniApp = await fromRepositoryPromise(
      this.prismaService.miniApp.findUniqueOrThrow({
        where: { id },
        select: { icon: true },
      })
    )
    if (existingMiniApp.isErr()) return err(existingMiniApp.error)

    const oldIconPath = existingMiniApp.value.icon
      ? this.fileService.getFilePathFromPublicUrl(existingMiniApp.value.icon)
      : null

    const deleteFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        if (!oldIconPath) return null
        const deleteResult = await fileTx.deleteFile(oldIconPath)
        if (deleteResult.isErr()) return deleteResult
        return deleteResult.value
      })
    )
    if (deleteFileResult.isErr()) return err(deleteFileResult.error)
    const [, fileTx] = deleteFileResult.value

    const deleteResult = await fromRepositoryPromise(
      this.prismaService.miniApp.delete({
        where: { id },
      })
    )

    if (deleteResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(deleteResult.error)
    }

    return ok(deleteResult.value)
  }
}

export const AdminMiniAppRepositoryPlugin = new Elysia({ name: 'AdminMiniAppRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    adminMiniAppRepository: new AdminMiniAppRepository(prismaService, fileService),
  }))
