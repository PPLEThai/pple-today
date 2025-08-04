import node from '@elysiajs/node'
import Elysia from 'elysia'

import { PutDraftedAnnouncementBody } from './models'

import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

export class AdminAnnouncementRepository {
  constructor(private prismaService: PrismaService) {}

  async getDraftedAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    return await fromPrismaPromise(async () => {
      const result = await this.prismaService.announcementDraft.findMany({
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          iconImage: true,
          backgroundColor: true,
          topics: {
            select: {
              topicId: true,
            },
          },
          attachments: {
            select: {
              url: true,
            },
          },
        },
        take: limit,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
      })

      return result.map((item) => ({
        ...item,
        topics: item.topics.map((topic) => topic.topicId),
        attachments: item.attachments.map((attachment) => attachment.url),
      }))
    })
  }

  async getDraftedAnnouncementById(announcementDraftId: string) {
    return await fromPrismaPromise(async () => {
      const result = await this.prismaService.announcementDraft.findUniqueOrThrow({
        where: { id: announcementDraftId },
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          iconImage: true,
          backgroundColor: true,
          topics: {
            select: {
              topicId: true,
            },
          },
          attachments: {
            select: {
              url: true,
            },
          },
        },
      })

      return {
        ...result,
        topics: result.topics.map((topic) => topic.topicId),
        attachments: result.attachments.map((attachment) => attachment.url),
      }
    })
  }

  async createEmptyDraftedAnnouncement() {
    return await fromPrismaPromise(this.prismaService.announcementDraft.create({ data: {} }))
  }

  async updateDraftedAnnouncementById(
    announcementDraftId: string,
    data: PutDraftedAnnouncementBody
  ) {
    return await fromPrismaPromise(
      this.prismaService.announcementDraft.update({
        where: { id: announcementDraftId },
        data: {
          title: data.title,
          content: data.content,
          type: data.type,
          iconImage: data.iconImage,
          backgroundColor: data.backgroundColor,
          topics: {
            deleteMany: {},
            createMany: {
              data: data.topicIds.map((topicId) => ({ topicId })),
            },
          },
          attachments: {
            // TODO: Call Delete File
            deleteMany: {},
            // TODO: Call Create File
            createMany: {
              data: data.attachmentUrls.map((url) => ({ url })),
            },
          },
        },
      })
    )
  }

  // TODO
  async publishDraftedAnnouncementById(announcementDraftId: string) {
    throw new Error('Not implemented')
  }

  async deleteDraftedAnnouncementById(announcementDraftId: string) {
    return await fromPrismaPromise(
      this.prismaService.announcementDraft.delete({ where: { id: announcementDraftId } })
    )
  }

  // TODO
  async uploadFileToDraft(announcementDraftId: string, file: unknown) {
    throw new Error('Not implemented')
  }

  // TODO
  async deleteFileInDraft(announcementDraftId: string, fileId: string) {
    throw new Error('Not implemented')
  }
}

export const AdminAnnouncementRepositoryPlugin = new Elysia({
  name: 'AdminAnnouncementRepository',
  adapter: node(),
})
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    adminAnnouncementRepository: new AdminAnnouncementRepository(prismaService),
  }))

export default AdminAnnouncementRepository
