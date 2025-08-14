import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  CreateBannerBody,
  CreateBannerResponse,
  GetBannerByIdResponse,
  GetBannersResponse,
  UpdateBannerBody,
} from './models'
import { AdminBannerRepository, AdminBannerRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../../dtos/error'
import { err } from '../../../utils/error'
import { mapRawPrismaError } from '../../../utils/prisma'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminBannerService {
  constructor(
    private readonly bannerRepository: AdminBannerRepository,
    private readonly fileService: FileService
  ) {}

  private async removeOldBannerImage(bannerId: string, newImageFilePath?: string) {
    const result = await this.bannerRepository.getBannerById(bannerId)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.BANNER_NOT_FOUND,
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

  async getBanners() {
    const result = await this.bannerRepository.getBanners()

    if (result.isErr()) return mapRawPrismaError(result.error)

    const imageBannerFilePaths = result.value.map((banner) => banner.imageFilePath)

    const imageBannerUrlResults = await this.fileService.bulkGetFileSignedUrl(imageBannerFilePaths)
    if (imageBannerUrlResults.isErr()) return err(imageBannerUrlResults.error)

    const response: GetBannersResponse = result.value.map(
      ({ imageFilePath, ...bannerBody }, index) => ({
        ...bannerBody,
        image: {
          url: imageBannerUrlResults.value[index],
          filePath: imageFilePath,
        },
      })
    )

    return ok(response)
  }

  async getBannerById(id: string) {
    const result = await this.bannerRepository.getBannerById(id)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.BANNER_NOT_FOUND,
        },
      })

    const { imageFilePath, ...bannerBody } = result.value

    const imageUrlResult = await this.fileService.getFileSignedUrl(imageFilePath)
    if (imageUrlResult.isErr()) return err(imageUrlResult.error)

    const response: GetBannerByIdResponse = {
      ...bannerBody,
      image: {
        url: imageUrlResult.value,
        filePath: imageFilePath,
      },
    }

    return ok(response)
  }

  async createBanner(data: CreateBannerBody) {
    const moveResult = await this.fileService.moveFileToPublicFolder([data.imageFilePath])

    if (moveResult.isErr()) return err(moveResult.error)
    const markFileStatusResult = await this.markShareMode(moveResult.value, data.status)

    if (markFileStatusResult.isErr()) return err(markFileStatusResult.error)
    const result = await this.bannerRepository.createBanner({
      ...data,
      imageFilePath: moveResult.value[0],
    })

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.BANNER_INVALID_INPUT,
          message: 'Invalid Input',
        },
      })

    const response: CreateBannerResponse = result.value

    return ok(response)
  }

  async updateBannerById(id: string, data: UpdateBannerBody) {
    const clearResult = await this.removeOldBannerImage(id, data.imageFilePath)
    if (clearResult.isErr()) return err(clearResult.error)

    const moveResult = await this.fileService.moveFileToPublicFolder([data.imageFilePath])
    if (moveResult.isErr()) return err(moveResult.error)

    const result = await this.bannerRepository.updateBannerById(id, {
      ...data,
      imageFilePath: moveResult.value[0],
    })
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.BANNER_NOT_FOUND,
          message: 'Banner not found',
        },
      })

    const markFileStatusResult = await this.markShareMode(moveResult.value, data.status)
    if (markFileStatusResult.isErr()) return err(markFileStatusResult.error)

    return ok()
  }

  async deleteBannerById(id: string) {
    const clearResult = await this.removeOldBannerImage(id)
    if (clearResult.isErr()) return err(clearResult.error)

    const result = await this.bannerRepository.deleteBannerById(id)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.BANNER_NOT_FOUND,
          message: 'Banner not found',
        },
      })

    return ok()
  }

  async reorderBanner(ids: string[]) {
    const result = await this.bannerRepository.reorderBanner(ids)

    if (result.isErr()) return mapRawPrismaError(result.error)

    return ok()
  }
}

export const AdminBannerServicePlugin = new Elysia({
  name: 'AdminBannerService',
})
  .use([AdminBannerRepositoryPlugin, FileServicePlugin])
  .decorate(({ bannerRepository, fileService }) => ({
    adminBannerService: new AdminBannerService(bannerRepository, fileService),
  }))
