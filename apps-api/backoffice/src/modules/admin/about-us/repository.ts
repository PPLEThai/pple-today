import { AboutUs } from '../../../dtos/aboutus'
import { prismaClient } from '../../../libs/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

abstract class AboutUsRepository {
  static async getAboutUs() {
    const response = await fromPrismaPromise(prismaClient.aboutUs.findMany())

    return response
  }

  static async createAboutUs(data: Omit<AboutUs, 'id'>) {
    const response = await fromPrismaPromise(prismaClient.aboutUs.create({ data }))

    return response
  }

  static async deleteAboutUs(postId: AboutUs['id']) {
    const response = await fromPrismaPromise(prismaClient.aboutUs.delete({ where: { id: postId } }))

    return response
  }
}

export default AboutUsRepository
