import node from '@elysiajs/node'
import Elysia from 'elysia'

import { AboutUs } from '../../../dtos/about-us'
import PrismaService from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

const AboutUsRepository = new Elysia({ name: 'AboutUsRepository', adapter: node() })
  .use(PrismaService)
  .decorate(({ prisma }) => ({
    aboutUsRepository: {
      async getAboutUs() {
        return await fromPrismaPromise(prisma.aboutUs.findMany())
      },
      async createAboutUs(data: Omit<AboutUs, 'id'>) {
        return await fromPrismaPromise(prisma.aboutUs.create({ data }))
      },
      async updateAboutUs(postId: AboutUs['id'], data: Omit<AboutUs, 'id'>) {
        return await fromPrismaPromise(prisma.aboutUs.update({ where: { id: postId }, data }))
      },
      async deleteAboutUs(postId: AboutUs['id']) {
        return await fromPrismaPromise(prisma.aboutUs.delete({ where: { id: postId } }))
      },
    },
  }))
  .as('scoped')

export default AboutUsRepository
