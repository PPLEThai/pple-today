import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetBannersResponse } from './models'
import { BannerRepository, BannerRepositoryPlugin } from './repository'

import { mapRepositoryError } from '../../utils/error'
import { FileService, FileServicePlugin } from '../file/services'

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

    const response: GetBannersResponse = banners.value.map((banner) => ({
      id: banner.id,
      navigation: banner.navigation,
      destination: banner.destination,
      imageUrl: this.fileService.getPublicFileUrl(banner.imageFilePath),
    }))

    return ok(response)
  }
}

export const BannerServicePlugin = new Elysia({ name: 'BannerService' })
  .use([BannerRepositoryPlugin, FileServicePlugin])
  .decorate(({ bannerRepository, fileService }) => ({
    bannerService: new BannerService(bannerRepository, fileService),
  }))
