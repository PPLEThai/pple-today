import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { BannerRepository, BannerRepositoryPlugin } from './repository'
import { toBannerResponse } from './to-response'

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

    return ok(
      toBannerResponse(banners.value, (imageFilePath) =>
        this.fileServerService.getFileEndpointUrl(imageFilePath)
      )
    )
  }
}

export const BannerServicePlugin = new Elysia({ name: 'BannerService' })
  .use([BannerRepositoryPlugin, FileServerServicePlugin])
  .decorate(({ bannerRepository, fileServerService }) => ({
    bannerService: new BannerService(bannerRepository, fileServerService),
  }))
