import { ok } from 'neverthrow'

import { GetAboutUsResponse } from './models'
import AboutUsRepository from './repository'

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
}

export default AboutUsService
