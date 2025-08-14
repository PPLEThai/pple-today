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
import { err } from '../../../utils/error'
import { mapRawPrismaError } from '../../../utils/prisma'
import { FileService, FileServicePlugin } from '../../file/services'

export class CarouselService {
  constructor(
    private carouselRepository: CarouselRepository,
    private readonly fileService: FileService
  ) {}

  private async removeOldBannerImage(carouselId: string) {
    const result = await this.carouselRepository.getCarouselById(carouselId)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.CAROUSEL_NOT_FOUND,
        },
      })

    const { imageFilePath } = result.value

    return await this.fileService.deleteFile(imageFilePath)
  }

  private async markShareMode(filePaths: string[], mode: 'PUBLISH' | 'DRAFT') {
    let markFileStatus

    if (mode === 'PUBLISH') {
      markFileStatus = await this.fileService.bulkMarkAsPublic(filePaths)
    } else {
      markFileStatus = await this.fileService.bulkMarkAsPrivate(filePaths)
    }

    if (markFileStatus.isErr()) return err(markFileStatus.error)
    return ok()
  }

  async getCarousels() {
    const result = await this.carouselRepository.getCarousels()

    if (result.isErr()) return mapRawPrismaError(result.error)

    const imageBannerFilePaths = result.value.map((carousel) => carousel.imageFilePath)

    const imageBannerUrlResults = await this.fileService.bulkGetFileSignedUrl(imageBannerFilePaths)
    if (imageBannerUrlResults.isErr()) return err(imageBannerUrlResults.error)

    const response: GetCarouselsResponse = result.value.map(
      ({ imageFilePath, ...carouselBody }, index) => ({
        ...carouselBody,
        image: {
          url: imageBannerUrlResults.value[index],
          filePath: imageFilePath,
        },
      })
    )

    return ok(response)
  }

  async getCarouselById(id: string) {
    const result = await this.carouselRepository.getCarouselById(id)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.CAROUSEL_NOT_FOUND,
        },
      })

    const { imageFilePath, ...carouselBody } = result.value

    const imageUrlResult = await this.fileService.getFileSignedUrl(imageFilePath)
    if (imageUrlResult.isErr()) return err(imageUrlResult.error)

    const response: GetCarouselByIdResponse = {
      ...carouselBody,
      image: {
        url: imageUrlResult.value,
        filePath: imageFilePath,
      },
    }

    return ok(response)
  }

  async createCarousel(data: CreateCarouselBody) {
    const moveResult = await this.fileService.moveFileToPublicFolder([data.imageFilePath])

    if (moveResult.isErr()) return err(moveResult.error)
    const markFileStatusResult = await this.markShareMode([data.imageFilePath], data.status)

    if (markFileStatusResult.isErr()) return err(markFileStatusResult.error)
    const result = await this.carouselRepository.createCarousel(data)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.CAROUSEL_INVALID_INPUT,
          message: 'Invalid Input',
        },
      })

    const response: CreateCarouselResponse = result.value

    return ok(response)
  }

  async updateCarouselById(id: string, data: UpdateCarouselBody) {
    const existingCarousel = await this.carouselRepository.getCarouselById(id)

    if (existingCarousel.isErr())
      return mapRawPrismaError(existingCarousel.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.CAROUSEL_NOT_FOUND,
        },
      })

    if (data.imageFilePath && data.imageFilePath !== existingCarousel.value.imageFilePath) {
      const clearResult = await this.removeOldBannerImage(id)
      if (clearResult.isErr()) return err(clearResult.error)
    }

    const moveResult = await this.fileService.moveFileToPublicFolder([data.imageFilePath])
    if (moveResult.isErr()) return err(moveResult.error)

    const result = await this.carouselRepository.updateCarouselById(id, data)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.CAROUSEL_NOT_FOUND,
          message: 'Carousel not found',
        },
      })

    const markFileStatusResult = await this.markShareMode(
      [existingCarousel.value.imageFilePath],
      data.status
    )

    if (markFileStatusResult.isErr()) return err(markFileStatusResult.error)

    return ok()
  }

  async deleteCarouselById(id: string) {
    const clearResult = await this.removeOldBannerImage(id)
    if (clearResult.isErr()) return err(clearResult.error)

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
  .use([CarouselRepositoryPlugin, FileServicePlugin])
  .decorate(({ carouselRepository, fileService }) => ({
    carouselService: new CarouselService(carouselRepository, fileService),
  }))
