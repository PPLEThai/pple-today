import { AboutUs } from '../../../dtos/about-us'
import { prismaClient } from '../../../libs/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

abstract class AboutUsRepository {
  static async getAboutUs() {
    return await fromPrismaPromise(prismaClient.aboutUs.findMany())
  }

  static async createAboutUs(data: Omit<AboutUs, 'id'>) {
    return await fromPrismaPromise(prismaClient.aboutUs.create({ data }))
  }

  static async updateAboutUs(postId: AboutUs['id'], data: Omit<AboutUs, 'id'>) {
    return await fromPrismaPromise(prismaClient.aboutUs.update({ where: { id: postId }, data }))
  }

  static async deleteAboutUs(postId: AboutUs['id']) {
    return await fromPrismaPromise(prismaClient.aboutUs.delete({ where: { id: postId } }))
  }
}

export default AboutUsRepository
