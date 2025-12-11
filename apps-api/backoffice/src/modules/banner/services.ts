import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetBannersResponse } from './models'
import { BannerRepository, BannerRepositoryPlugin } from './repository'

import { FileServerService, FileServerServicePlugin } from '../files/services'

export class BannerService {
  constructor(
    private readonly bannerRepository: BannerRepository,
    private readonly fileServerService: FileServerService
  ) {}

  async getBanners() {
    const banners = await this.bannerRepository.getBanners()

    if (banners.isErr()) {
      return mapRepositoryError(banners.error)
    }

    const response: GetBannersResponse = banners.value.map((banner) => {
      if (banner.navigation === 'MINI_APP') {
        return {
          id: banner.id,
          navigation: banner.navigation,
          slug: banner.miniApp!.slug,
          imageUrl: this.fileServerService.getFileEndpointUrl(banner.imageFilePath),
        }
      }

      if (banner.navigation === 'IN_APP_NAVIGATION') {
        return {
          id: banner.id,
          navigation: banner.navigation,
          inAppId: banner.inAppId!,
          inAppType: banner.inAppType!,
          imageUrl: this.fileServerService.getFileEndpointUrl(banner.imageFilePath),
        }
      }

      return {
        id: banner.id,
        navigation: banner.navigation,
        destination: banner.destination!,
        imageUrl: this.fileServerService.getFileEndpointUrl(banner.imageFilePath),
      }
    })

    return ok(response)
  }
}

export const BannerServicePlugin = new Elysia({ name: 'BannerService' })
  .use([BannerRepositoryPlugin, FileServerServicePlugin])
  .decorate(({ bannerRepository, fileServerService }) => ({
    bannerService: new BannerService(bannerRepository, fileServerService),
  }))
