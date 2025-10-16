import { FileService } from '@pple-today/api-common/services'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetBannersResponse } from './models'
import { BannerRepository, BannerRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../plugins/file'

export class BannerService {
  constructor(
    private readonly bannerRepository: BannerRepository,
    private readonly fileService: FileService
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
          destination: banner.miniApp!.clientUrl!,
          miniAppId: banner.miniApp!.id,
          imageUrl: this.fileService.getPublicFileUrl(banner.imageFilePath),
        }
      }

      return {
        id: banner.id,
        navigation: banner.navigation,
        destination: banner.destination!,
        imageUrl: this.fileService.getPublicFileUrl(banner.imageFilePath),
      }
    })

    return ok(response)
  }
}

export const BannerServicePlugin = new Elysia({ name: 'BannerService' })
  .use([BannerRepositoryPlugin, FileServicePlugin])
  .decorate(({ bannerRepository, fileService }) => ({
    bannerService: new BannerService(bannerRepository, fileService),
  }))
