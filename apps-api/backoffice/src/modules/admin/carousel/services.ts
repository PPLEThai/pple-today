import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  CreateCarouselBody,
  CreateCarouselResponse,
  GetCarouselByIdResponse,
  GetCarouselsResponse,
  UpdateCarouselBody,
} from './models'
import { CarouselRepository, CarouselRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../../dtos/error'
import { mapRawPrismaError } from '../../../utils/prisma'

export class CarouselService {
  constructor(private carouselRepository: CarouselRepository) {}

  async getCarousels() {
    const result = await this.carouselRepository.getCarousels()

    if (result.isErr()) return mapRawPrismaError(result.error)

    return ok(result.value satisfies GetCarouselsResponse)
  }

  async getCarouselById(id: string) {
    const result = await this.carouselRepository.getCarouselById(id)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.CAROUSEL_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetCarouselByIdResponse)
  }

  async createCarousel(data: CreateCarouselBody) {
    const result = await this.carouselRepository.createCarousel(data)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.CAROUSEL_INVALID_INPUT,
          message: 'Invalid Input',
        },
      })

    return ok(result.value satisfies CreateCarouselResponse)
  }

  async updateCarouselById(id: string, data: UpdateCarouselBody) {
    const result = await this.carouselRepository.updateCarouselById(id, data)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.CAROUSEL_NOT_FOUND,
          message: 'Carousel not found',
        },
      })

    return ok()
  }

  async deleteCarouselById(id: string) {
    const result = await this.carouselRepository.deleteCarouselById(id)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.CAROUSEL_NOT_FOUND,
          message: 'Carousel not found',
        },
      })

    return ok()
  }

  async reorderCarousel(ids: string[]) {
    const result = await this.carouselRepository.reorderCarousel(ids)

    if (result.isErr()) return mapRawPrismaError(result.error)

    return ok()
  }
}

export const CarouselServicePlugin = new Elysia({ name: 'CarouselService' })
  .use(CarouselRepositoryPlugin)
  .decorate(({ carouselRepository }) => ({
    carouselService: new CarouselService(carouselRepository),
  }))
