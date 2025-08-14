import Elysia from 'elysia'

import { BannerStatusType } from '../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class BannerRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getBanners() {
    return fromPrismaPromise(
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
