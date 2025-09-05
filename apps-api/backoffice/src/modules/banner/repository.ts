import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { BannerStatusType } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

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
