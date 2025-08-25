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
import { FilePath } from '../../../dtos/file'
import { err } from '../../../utils/error'
import { mapRepositoryError } from '../../../utils/error'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminBannerService {
  constructor(
    private readonly bannerRepository: AdminBannerRepository,
    private readonly fileService: FileService
  ) {}

  async getBanners() {
    const result = await this.bannerRepository.getBanners()

    if (result.isErr()) return mapRepositoryError(result.error)

    const imageBannerFilePaths = result.value.map((banner) => banner.imageFilePath)
    const imageBannerUrlResults = await this.fileService.bulkGetFileSignedUrl(imageBannerFilePaths)

    if (imageBannerUrlResults.isErr()) return err(imageBannerUrlResults.error)

    const response: GetBannersResponse = result.value.map(
      ({ imageFilePath, ...bannerBody }, index) => ({
        ...bannerBody,
        image: {
          url: imageBannerUrlResults.value[index],
          filePath: imageFilePath as FilePath,
        },
      })
    )

    return ok(response)
  }

  async getBannerById(id: string) {
    const result = await this.bannerRepository.getBannerById(id)

    if (result.isErr())
      return mapRepositoryError(result.error, {
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
        filePath: imageFilePath as FilePath,
      },
    }

    return ok(response)
  }

  async createBanner(data: CreateBannerBody) {
    const result = await this.bannerRepository.createBanner(data)

    if (result.isErr())
      return mapRepositoryError(result.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.BANNER_INVALID_INPUT,
          message: 'Invalid Input',
        },
      })

    const response: CreateBannerResponse = result.value

    return ok(response)
  }

  async updateBannerById(id: string, data: UpdateBannerBody) {
    const result = await this.bannerRepository.updateBannerById(id, data)

    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.BANNER_NOT_FOUND,
          message: 'Banner not found',
        },
      })

    return ok()
  }

  async deleteBannerById(id: string) {
    const result = await this.bannerRepository.deleteBannerById(id)

    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.BANNER_NOT_FOUND,
          message: 'Banner not found',
        },
      })

    return ok()
  }

  async reorderBanner(ids: string[]) {
    const result = await this.bannerRepository.reorderBanner(ids)

    if (result.isErr()) return mapRepositoryError(result.error)

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
