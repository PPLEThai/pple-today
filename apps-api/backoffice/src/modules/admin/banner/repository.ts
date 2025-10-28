import { FilePath, InternalErrorCode } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { BannerStatusType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { CreateBannerBody, UpdateBannerBody } from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

const PUBLISHED_BANNER_LIMIT = 5

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

  async createBanner(data: CreateBannerBody) {
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
            headline: data.headline,
            navigation: data.navigation,
            destination: data.destination,
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

  async updateBannerById(id: string, data: UpdateBannerBody) {
    const existingBanner = await fromRepositoryPromise(
      this.prismaService.banner.findUniqueOrThrow({
        where: { id },
        select: { imageFilePath: true, status: true },
      })
    )
    if (existingBanner.isErr()) return err(existingBanner.error)

    const totalPublishedBanners = await fromRepositoryPromise(
      this.prismaService.banner.count({
        where: { status: BannerStatusType.PUBLISHED },
      })
    )
    if (totalPublishedBanners.isErr()) return err(totalPublishedBanners.error)

    if (
      totalPublishedBanners.value === PUBLISHED_BANNER_LIMIT &&
      existingBanner.value.status !== data.status &&
      data.status === BannerStatusType.PUBLISHED
    )
      return err({
        code: InternalErrorCode.BANNER_PUBLISHING_LIMIT_REACHED,
        message:
          'You can only have 5 published banners. Please unpublish a banner before publishing another one.',
      })

    const updateFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        if (!data.imageFilePath || existingBanner.value.imageFilePath === data.imageFilePath)
          return existingBanner.value.imageFilePath

        const deleteResult = await fileTx.deleteFile(existingBanner.value.imageFilePath as FilePath)
        if (deleteResult.isErr()) return deleteResult

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
          headline: data.headline,
          status: data.status,
          navigation: data.navigation,
          destination: data.destination,
          order: data.order,
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
        const deleteResult = await fileTx.deleteFile(existingBanner.value.imageFilePath as FilePath)
        if (deleteResult.isErr()) return deleteResult
        return deleteResult.value
      })
    )

    if (deleteFileResult.isErr()) return err(deleteFileResult.error)
    const [deletedFile, fileTx] = deleteFileResult.value

    const deleteBannerResult = await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        // TODO - Perhaps use Lexorank?
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
