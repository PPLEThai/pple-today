import Elysia from 'elysia'

import { BannerNavigationType, BannerStatusType } from '../../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromRepositoryPromise, throwWithReturnType } from '../../../utils/error'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminBannerRepository {
  constructor(
    private prisma: PrismaService,
    private fileService: FileService
  ) {}

  async getBanners() {
    return fromRepositoryPromise(
      this.prisma.banner.findMany({
        orderBy: { order: 'asc' },
      })
    )
  }

  async getBannerById(id: string) {
    return fromRepositoryPromise(
      this.prisma.banner.findUniqueOrThrow({
        where: { id },
      })
    )
  }

  async createBanner(data: {
    imageFilePath: string
    navigation: BannerNavigationType
    destination: string
    status: BannerStatusType
  }) {
    return fromRepositoryPromise(
      this.fileService.$transaction((fileTx) =>
        this.prisma.$transaction(async (tx) => {
          const lastBanner = await tx.banner.findFirst({
            orderBy: { order: 'desc' },
            select: { order: true },
          })

          const moveResult = await fileTx.bulkMoveToPublicFolder([data.imageFilePath])
          if (moveResult.isErr()) return throwWithReturnType(moveResult)

          return tx.banner.create({
            data: {
              imageFilePath: moveResult.value[0],
              navigation: data.navigation,
              destination: data.destination,
              status: data.status, // Default value
              order: lastBanner ? lastBanner.order + 1 : 0,
            },
            select: {
              id: true,
            },
          })
        })
      )
    )
  }

  async updateBannerById(
    id: string,
    data: {
      imageFilePath: string
      navigation: BannerNavigationType
      destination: string
      status: BannerStatusType
    }
  ) {
    return fromRepositoryPromise(
      this.fileService.$transaction((fileTx) =>
        this.prisma.$transaction(async (tx) => {
          const existingBanner = await tx.banner.findUniqueOrThrow({
            where: { id },
          })

          if (existingBanner.imageFilePath !== data.imageFilePath) {
            const deleteResult = await fileTx.bulkMoveToTempFolder([existingBanner.imageFilePath])
            if (deleteResult.isErr()) return throwWithReturnType(deleteResult)
          }

          const moveResult = await fileTx.bulkMoveToPublicFolder([data.imageFilePath])
          if (moveResult.isErr()) return throwWithReturnType(moveResult)

          return tx.banner.update({
            where: { id },
            data: {
              imageFilePath: moveResult.value[0],
              navigation: data.navigation,
              destination: data.destination,
              status: data.status,
            },
          })
        })
      )
    )
  }

  async deleteBannerById(id: string) {
    return fromRepositoryPromise(
      this.fileService.$transaction((fileTx) =>
        this.prisma.$transaction(async (tx) => {
          const deleted = await tx.banner.delete({
            where: { id },
          })

          // Reorder remaining banners
          const banners = await tx.banner.findMany({
            orderBy: { order: 'asc' },
            select: { id: true },
          })

          const deleteImageResult = await fileTx.bulkMoveToTempFolder([deleted.imageFilePath])
          if (deleteImageResult.isErr()) return throwWithReturnType(deleteImageResult)

          await Promise.all(
            banners.map((banner, index) =>
              tx.banner.update({
                where: { id: banner.id },
                data: { order: index },
              })
            )
          )

          return deleted
        })
      )
    )
  }

  async reorderBanner(ids: string[]) {
    return fromRepositoryPromise(
      this.prisma.$transaction(
        ids.map((id, index) =>
          this.prisma.banner.update({
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
