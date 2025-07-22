import { AboutUs } from '../../../dtos/aboutus'
import { prismaClient } from '../../../libs/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

abstract class AboutUsRepository {
  static async getAboutUs() {
    const response = await fromPrismaPromise(prismaClient.aboutUs.findMany())

    return response
  }

  static async createAboutUs(data: AboutUs) {
    const response = await fromPrismaPromise(prismaClient.aboutUs.create({ data }))

    return response
  }
}

export default AboutUsRepository
