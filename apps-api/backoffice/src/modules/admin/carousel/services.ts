import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  CreateCarouselBody,
  CreateCarouselResponse,
  GetCarouselByIdResponse,
  GetCarouselsResponse,
  UpdateCarouselBody,
} from './models'
import { AdminCarouselRepository, AdminCarouselRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../../dtos/error'
import { err } from '../../../utils/error'
import { mapRawPrismaError } from '../../../utils/prisma'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminCarouselService {
  constructor(
    private readonly carouselRepository: AdminCarouselRepository,
    private readonly fileService: FileService
  ) {}

  private async removeOldBannerImage(carouselId: string, newImageFilePath?: string) {
    const result = await this.carouselRepository.getCarouselById(carouselId)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.CAROUSEL_NOT_FOUND,
        },
      })

    const { imageFilePath } = result.value

    if (newImageFilePath || (imageFilePath && imageFilePath !== newImageFilePath)) {
      return await this.fileService.deleteFile(imageFilePath)
    }

    return ok()
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
    const markFileStatusResult = await this.markShareMode(moveResult.value, data.status)

    if (markFileStatusResult.isErr()) return err(markFileStatusResult.error)
    const result = await this.carouselRepository.createCarousel({
      ...data,
      imageFilePath: moveResult.value[0],
    })

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
    const clearResult = await this.removeOldBannerImage(id, data.imageFilePath)
    if (clearResult.isErr()) return err(clearResult.error)

    const moveResult = await this.fileService.moveFileToPublicFolder([data.imageFilePath])
    if (moveResult.isErr()) return err(moveResult.error)

    const result = await this.carouselRepository.updateCarouselById(id, {
      ...data,
      imageFilePath: moveResult.value[0],
    })
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.CAROUSEL_NOT_FOUND,
          message: 'Carousel not found',
        },
      })

    const markFileStatusResult = await this.markShareMode(moveResult.value, data.status)
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

export const AdminCarouselServicePlugin = new Elysia({
  name: 'AdminCarouselService',
})
  .use([AdminCarouselRepositoryPlugin, FileServicePlugin])
  .decorate(({ carouselRepository, fileService }) => ({
    adminCarouselService: new AdminCarouselService(carouselRepository, fileService),
  }))
