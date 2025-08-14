import Elysia from 'elysia'

import { BannerNavigationType, BannerStatusType } from '../../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

export class AdminBannerRepository {
  constructor(private prisma: PrismaService) {}

  async getBanners() {
    return fromPrismaPromise(
      this.prisma.banner.findMany({
        orderBy: { order: 'asc' },
      })
    )
  }

  async getBannerById(id: string) {
    return fromPrismaPromise(
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
    return fromPrismaPromise(
      this.prisma.$transaction(async (tx) => {
        const lastBanner = await tx.banner.findFirst({
          orderBy: { order: 'desc' },
          select: { order: true },
        })

        return tx.banner.create({
          data: {
            imageFilePath: data.imageFilePath,
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
    return fromPrismaPromise(
      this.prisma.banner.update({
        where: { id },
        data: {
          imageFilePath: data.imageFilePath,
          navigation: data.navigation,
          destination: data.destination,
          status: data.status,
        },
      })
    )
  }

  async deleteBannerById(id: string) {
    return fromPrismaPromise(
      this.prisma.$transaction(async (tx) => {
        const deleted = await tx.banner.delete({
          where: { id },
        })

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

        return deleted
      })
    )
  }

  async reorderBanner(ids: string[]) {
    return fromPrismaPromise(
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
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    bannerRepository: new AdminBannerRepository(prismaService),
  }))
