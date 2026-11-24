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
          status: BannerStatusType.PUBLISHED,
        },
        orderBy: {
          order: 'asc',
        },
        include: {
          miniApp: {
            include: {
              linkNames: {
                where: { canonicalForId: { not: null } },
                select: { name: true },
                take: 1,
              },
            },
          },
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
