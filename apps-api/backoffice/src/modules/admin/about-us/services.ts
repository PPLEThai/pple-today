import node from '@elysiajs/node'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetAboutUsResponse } from './models'
import AboutUsRepository, { AboutUsRepositoryPlugin } from './repository'

import { AboutUs } from '../../../dtos/about-us'
import { InternalErrorCode } from '../../../dtos/error'
import { mapRawPrismaError } from '../../../utils/prisma'

export class AboutUsService {
  constructor(private aboutUsRepository: AboutUsRepository) {}
  async getAboutUs() {
    const result = await this.aboutUsRepository.getAboutUs()
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(
      result.value.map((data) => ({
        id: data.id,
        title: data.title,
        url: data.url,
        iconImageUrl: data.iconImageUrl,
        backgroundColor: data.backgroundColor,
      })) satisfies GetAboutUsResponse
    )
  }

  async createAboutUs(data: Omit<AboutUs, 'id'>) {
    const result = await this.aboutUsRepository.createAboutUs(data)
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok({ message: `About us "${data.title}" created.` })
  }

  async updateAboutUs(aboutUsId: AboutUs['id'], data: Omit<AboutUs, 'id'>) {
    const result = await this.aboutUsRepository.updateAboutUs(aboutUsId, data)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ABOUT_US_NOT_FOUND,
        },
      })

    return ok({ message: `About us ${aboutUsId} updated.` })
  }

  async deleteAboutUs(aboutUsId: AboutUs['id']) {
    const result = await this.aboutUsRepository.deleteAboutUs(aboutUsId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ABOUT_US_NOT_FOUND,
        },
      })

    return ok({ message: `About us ${aboutUsId} deleted.` })
  }
}

export const AboutUsServicePlugin = new Elysia({ name: 'AboutUsService', adapter: node() })
  .use(AboutUsRepositoryPlugin)
  .decorate(({ aboutUsRepository }) => ({
    aboutUsService: new AboutUsService(aboutUsRepository),
  }))
