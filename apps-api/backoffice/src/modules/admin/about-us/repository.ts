import { prismaClient } from '../../../libs/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

abstract class AboutUsRepository {
  static async getAboutUs() {
    const response = await fromPrismaPromise(prismaClient.aboutUs.findMany())

    return response
  }
}

export default AboutUsRepository
