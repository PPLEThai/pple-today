import Elysia from 'elysia'

import { BannerStatusType } from '@pple-today/database/prisma'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromRepositoryPromise } from '../../utils/error'

export class BannerRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getBanners() {
    return fromRepositoryPromise(
      this.prismaService.banner.findMany({
        where: {
          status: BannerStatusType.PUBLISH,
        },
        orderBy: {
          order: 'asc',
        },
      })
    )
  }
}

export const BannerRepositoryPlugin = new Elysia({ name: 'BannerRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    bannerRepository: new BannerRepository(prismaService),
  }))
