import Elysia from 'elysia'

import {
  CarouselNavigationType,
  CarouselStatusType,
  PrismaClient,
} from '../../../../__generated__/prisma'
import { PrismaServicePlugin } from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

export class CarouselRepository {
  constructor(private prisma: PrismaClient) {}

  async getCarousels() {
    return fromPrismaPromise(
      this.prisma.carousel.findMany({
        orderBy: { order: 'asc' },
      })
    )
  }

  async getCarouselById(id: string) {
    return fromPrismaPromise(
      this.prisma.carousel.findUniqueOrThrow({
        where: { id },
      })
    )
  }

  async createCarousel(data: { imageFilePath: string; navigation: CarouselNavigationType }) {
    return fromPrismaPromise(
      this.prisma.$transaction(async (tx) => {
        const lastCarousel = await tx.carousel.findFirst({
          orderBy: { order: 'desc' },
          select: { order: true },
        })

        return tx.carousel.create({
          data: {
            imageFilePath: data.imageFilePath,
            navigation: data.navigation,
            status: CarouselStatusType.DRAFT, // Default value
            order: lastCarousel ? lastCarousel.order + 1 : 0,
          },
          select: {
            id: true,
          },
        })
      })
    )
  }

  async updateCarouselById(
    id: string,
    data: {
      imageFilePath: string
      navigation: CarouselNavigationType
      status: CarouselStatusType
    }
  ) {
    return fromPrismaPromise(
      this.prisma.carousel.update({
        where: { id },
        data: {
          imageFilePath: data.imageFilePath,
          navigation: data.navigation,
          status: data.status,
        },
      })
    )
  }

  async deleteCarouselById(id: string) {
    return fromPrismaPromise(
      this.prisma.$transaction(async (tx) => {
        const deleted = await tx.carousel.delete({
          where: { id },
        })

        // Reorder remaining carousels
        const carousels = await tx.carousel.findMany({
          orderBy: { order: 'asc' },
          select: { id: true },
        })

        await Promise.all(
          carousels.map((carousel, index) =>
            tx.carousel.update({
              where: { id: carousel.id },
              data: { order: index },
            })
          )
        )

        return deleted
      })
    )
  }

  async reorderCarousel(ids: string[]) {
    return fromPrismaPromise(
      this.prisma.$transaction(
        ids.map((id, index) =>
          this.prisma.carousel.update({
            where: { id },
            data: { order: index },
          })
        )
      )
    )
  }
}

export const CarouselRepositoryPlugin = new Elysia({ name: 'CarouselRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    carouselRepository: new CarouselRepository(prismaService),
  }))
