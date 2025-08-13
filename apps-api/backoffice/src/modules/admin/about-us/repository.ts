import Elysia from 'elysia'

import { AboutUs } from '../../../dtos/about-us'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromRepositoryPromise } from '../../../utils/error'

export class AboutUsRepository {
  constructor(private prisma: PrismaService) {}
  async getAboutUs() {
    return await fromRepositoryPromise(this.prisma.aboutUs.findMany())
  }
  async createAboutUs(data: Omit<AboutUs, 'id'>) {
    return await fromRepositoryPromise(this.prisma.aboutUs.create({ data }))
  }
  async updateAboutUs(postId: AboutUs['id'], data: Omit<AboutUs, 'id'>) {
    return await fromRepositoryPromise(this.prisma.aboutUs.update({ where: { id: postId }, data }))
  }
  async deleteAboutUs(postId: AboutUs['id']) {
    return await fromRepositoryPromise(this.prisma.aboutUs.delete({ where: { id: postId } }))
  }
}

export const AboutUsRepositoryPlugin = new Elysia({ name: 'AboutUsRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    aboutUsRepository: new AboutUsRepository(prismaService),
  }))

export default AboutUsRepository
