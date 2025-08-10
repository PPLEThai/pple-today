import Elysia from 'elysia'

import { CarouselStatusType } from '../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class CarouselRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getCarousels() {
    return fromPrismaPromise(
      this.prismaService.carousel.findMany({
        where: {
          status: CarouselStatusType.PUBLISH,
        },
        orderBy: {
          order: 'asc',
        },
      })
    )
  }
}

export const CarouselRepositoryPlugin = new Elysia({ name: 'CarouselRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    carouselRepository: new CarouselRepository(prismaService),
  }))
