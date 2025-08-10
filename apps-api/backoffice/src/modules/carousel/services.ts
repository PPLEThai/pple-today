import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetCarouselsResponse } from './models'
import { CarouselRepository, CarouselRepositoryPlugin } from './repository'

import { mapRawPrismaError } from '../../utils/prisma'
import { FileService, FileServicePlugin } from '../file/services'

export class CarouselService {
  constructor(
    private readonly carouselRepository: CarouselRepository,
    private readonly fileService: FileService
  ) {}

  async getCarousels() {
    const carousels = await this.carouselRepository.getCarousels()

    if (carousels.isErr()) {
      return mapRawPrismaError(carousels.error)
    }

    return ok(
      carousels.value.map((carousel) => ({
        id: carousel.id,
        navigation: carousel.navigation,
        order: carousel.order,
        imageFilePath: this.fileService.getPublicFileUrl(carousel.imageFilePath).value,
      })) satisfies GetCarouselsResponse
    )
  }
}

export const CarouselServicePlugin = new Elysia({ name: 'CarouselService' })
  .use([CarouselRepositoryPlugin, FileServicePlugin])
  .decorate(({ carouselRepository, fileService }) => ({
    carouselService: new CarouselService(carouselRepository, fileService),
  }))
