import { PrismaService } from '@pple-today/api-common/services'
import { BannerNavigationType, BannerStatusType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { FilePath } from '../../../dtos/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'
import { fromRepositoryPromise } from '../../../utils/error'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminBannerRepository {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService
  ) {}

  async getBanners() {
    return fromRepositoryPromise(
      this.prismaService.banner.findMany({
        orderBy: { order: 'asc' },
      })
    )
  }

  async getBannerById(id: string) {
    return fromRepositoryPromise(
      this.prismaService.banner.findUniqueOrThrow({
        where: { id },
      })
    )
  }

  async createBanner(data: {
    imageFilePath: FilePath
    navigation: BannerNavigationType
    destination: string
    status: BannerStatusType
  }) {
    const moveFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const moveResult = await fileTx.bulkMoveToPublicFolder([data.imageFilePath])
        if (moveResult.isErr()) return moveResult

        return moveResult.value[0]
      })
    )

    if (moveFileResult.isErr()) return err(moveFileResult.error)

    const [newFileName, fileTx] = moveFileResult.value
    const createBannerResult = await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const lastBanner = await this.prismaService.banner.findFirst({
          orderBy: { order: 'desc' },
          select: { order: true },
        })

        return tx.banner.create({
          data: {
            imageFilePath: newFileName,
            navigation: data.navigation,
            destination: data.destination,
            status: data.status, // Default value
            order: lastBanner ? lastBanner.order + 1 : 1,
          },
          select: {
            id: true,
          },
        })
      })
    )

    if (createBannerResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(createBannerResult.error)
    }

    return ok(createBannerResult.value)
  }

  async updateBannerById(
    id: string,
    data: {
      imageFilePath: FilePath
      navigation: BannerNavigationType
      destination: string
      status: BannerStatusType
    }
  ) {
    const existingBanner = await fromRepositoryPromise(
      this.prismaService.banner.findUniqueOrThrow({
        where: { id },
        select: { imageFilePath: true },
      })
    )

    if (existingBanner.isErr()) return err(existingBanner.error)

    const updateFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        if (existingBanner.value.imageFilePath !== data.imageFilePath) {
          const deleteResult = await fileTx.removeFile(
            existingBanner.value.imageFilePath as FilePath
          )
          if (deleteResult.isErr()) return deleteResult
        }

        const moveResult = await fileTx.bulkMoveToPublicFolder([data.imageFilePath])
        if (moveResult.isErr()) return moveResult

        return moveResult.value[0]
      })
    )

    if (updateFileResult.isErr()) {
      return err(updateFileResult.error)
    }

    const [newImageFilePath, fileTx] = updateFileResult.value
    const updateBannerResult = await fromRepositoryPromise(
      this.prismaService.banner.update({
        where: { id },
        data: {
          imageFilePath: newImageFilePath,
          navigation: data.navigation,
          destination: data.destination,
          status: data.status,
        },
      })
    )

    if (updateBannerResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(updateBannerResult.error)
    }

    return ok(updateBannerResult.value)
  }

  async deleteBannerById(id: string) {
    const existingBanner = await fromRepositoryPromise(
      this.prismaService.banner.findUniqueOrThrow({
        where: { id },
        select: { imageFilePath: true },
      })
    )

    if (existingBanner.isErr()) return err(existingBanner.error)

    const deleteFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const deleteResult = await fileTx.removeFile(existingBanner.value.imageFilePath as FilePath)
        if (deleteResult.isErr()) return deleteResult

        return deleteResult.value
      })
    )

    if (deleteFileResult.isErr()) {
      return err(deleteFileResult.error)
    }

    const [deletedFile, fileTx] = deleteFileResult.value
    const deleteBannerResult = await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        // Reorder remaining banners
        const banners = await tx.banner.findMany({
          orderBy: { order: 'asc' },
          select: { id: true },
        })

        await Promise.all(
          banners.map((banner, index) =>
            tx.banner.update({
              where: { id: banner.id },
              data: { order: index },
            })
          )
        )

        return
      })
    )

    if (deleteBannerResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(deleteBannerResult.error)
    }

    return ok(deletedFile)
  }

  async reorderBanner(ids: string[]) {
    return fromRepositoryPromise(
      this.prismaService.$transaction(
        ids.map((id, index) =>
          this.prismaService.banner.update({
            where: { id },
            data: { order: index },
          })
        )
      )
    )
  }
}

export const AdminBannerRepositoryPlugin = new Elysia({ name: 'AdminBannerRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    bannerRepository: new AdminBannerRepository(prismaService, fileService),
  }))
