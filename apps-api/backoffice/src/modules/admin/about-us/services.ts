import { ok } from 'neverthrow'

import { GetAboutUsResponse } from './models'
import AboutUsRepository from './repository'

import { AboutUs } from '../../../dtos/aboutus'

abstract class AboutUsService {
  static async getAboutUs() {
    const result = await AboutUsRepository.getAboutUs()
    if (result.isErr()) {
      return result
    }

    const aboutUsData = result.value

    return ok(
      aboutUsData.map((data) => ({
        id: data.id,
        name: data.name,
        url: data.url,
        iconImage: data.iconImage,
        backgroundColor: data.backgroundColor,
      })) satisfies GetAboutUsResponse
    )
  }

  static async createAboutUs(data: Omit<AboutUs, 'id'>) {
    const result = await AboutUsRepository.createAboutUs(data)
    if (result.isErr()) {
      return result
    }

    return ok({
      message: `About us "${data.name}" created.`,
    })
  }

  static async deleteAboutUs(aboutUsId: AboutUs['id']) {
    const result = await AboutUsRepository.deleteAboutUs(aboutUsId)

    if (result.isErr()) {
      return result
    }

    return ok({
      message: `About us ${aboutUsId} deleted.`,
    })
  }
}

export default AboutUsService
