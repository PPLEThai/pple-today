import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { FilePath } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err } from '@pple-today/api-common/utils'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { BannerNavigationType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  CreateBannerBody,
  CreateBannerResponse,
  GetBannerByIdResponse,
  GetBannersQuery,
  GetBannersResponse,
  ReorderBannerByIdBody,
  ReorderBannerByIdParams,
  UpdateBannerBody,
} from './models'
import { AdminBannerRepository, AdminBannerRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../../plugins/file'

export class AdminBannerService {
  constructor(
    private readonly bannerRepository: AdminBannerRepository,
    private readonly fileService: FileService
  ) {}

  private checkBannerBody(data: CreateBannerBody | UpdateBannerBody) {
    if (data.navigation === BannerNavigationType.MINI_APP && !data.miniAppId)
      return err({
        code: InternalErrorCode.BANNER_INVALID_INPUT,
        message: 'miniAppId is required when navigation is MINI_APP',
      })
    if (data.navigation === BannerNavigationType.EXTERNAL_BROWSER && !data.destination)
      return err({
        code: InternalErrorCode.BANNER_INVALID_INPUT,
        message: 'destination is required when navigation is ',
      })
    if (
      data.navigation === BannerNavigationType.IN_APP_NAVIGATION &&
      !data.inAppId &&
      !data.inAppType
    )
      return err({
        code: InternalErrorCode.BANNER_INVALID_INPUT,
        message: 'inAppId and inAppType are required when navigation is IN_APP_NAVIGATION',
      })

    return ok()
  }

  async getBanners(query: GetBannersQuery) {
    const result = await this.bannerRepository.getBanners(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    const imageBannerFilePaths = result.value.map((banner) => banner.imageFilePath)
    const imageBannerUrlResults = await this.fileService.bulkGetFileSignedUrl(imageBannerFilePaths)

    if (imageBannerUrlResults.isErr()) return err(imageBannerUrlResults.error)

    const response: GetBannersResponse = result.value.map(
      ({ imageFilePath, navigation, miniAppId, destination, miniApp, ...bannerBody }, index) =>
        navigation === BannerNavigationType.MINI_APP
          ? {
              ...bannerBody,
              navigation,
              destination: miniApp!.clientUrl,
              miniAppId: miniAppId!,
              miniApp: {
                name: miniApp!.name,
              },
              image: {
                url: imageBannerUrlResults.value[index],
                filePath: imageFilePath as FilePath,
              },
            }
          : navigation === BannerNavigationType.IN_APP_NAVIGATION
            ? {
                ...bannerBody,
                navigation,
                inAppId: bannerBody.inAppId!,
                inAppType: bannerBody.inAppType!,
                image: {
                  url: imageBannerUrlResults.value[index],
                  filePath: imageFilePath as FilePath,
                },
              }
            : {
                ...bannerBody,
                navigation,
                destination: destination!,
                image: {
                  url: imageBannerUrlResults.value[index],
                  filePath: imageFilePath as FilePath,
                },
              }
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

    const response: GetBannerByIdResponse =
      bannerBody.navigation === BannerNavigationType.MINI_APP
        ? {
            ...bannerBody,
            navigation: bannerBody.navigation,
            destination: bannerBody.miniApp!.clientUrl,
            miniAppId: bannerBody.miniAppId!,
            miniApp: {
              name: bannerBody.miniApp!.name,
            },
            image: {
              url: imageUrlResult.value,
              filePath: imageFilePath as FilePath,
            },
          }
        : bannerBody.navigation === BannerNavigationType.IN_APP_NAVIGATION
          ? {
              ...bannerBody,
              navigation: bannerBody.navigation,
              inAppId: bannerBody.inAppId!,
              inAppType: bannerBody.inAppType!,
              image: {
                url: imageUrlResult.value,
                filePath: imageFilePath as FilePath,
              },
            }
          : {
              ...bannerBody,
              navigation: bannerBody.navigation,
              destination: bannerBody.destination!,
              image: {
                url: imageUrlResult.value,
                filePath: imageFilePath as FilePath,
              },
            }

    return ok(response)
  }

  async createBanner(data: CreateBannerBody) {
    const checkResult = this.checkBannerBody(data)
    if (checkResult.isErr()) return err(checkResult.error)

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
    const checkResult = this.checkBannerBody(data)
    if (checkResult.isErr()) return err(checkResult.error)

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

  async reorderBanner(id: ReorderBannerByIdParams['id'], data: ReorderBannerByIdBody) {
    const result = await this.bannerRepository.reorderBanner(id, data)

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
