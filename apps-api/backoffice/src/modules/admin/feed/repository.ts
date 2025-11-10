import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminFeedRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async updateFeedItemCommentPrivacy(id: string, data: { isPrivate: boolean }) {
    return fromRepositoryPromise(
      this.prismaService.feedItemComment.update({
        where: { id },
        data: {
          isPrivate: data.isPrivate,
        },
      })
    )
  }

  async getFeedCommentsById(id: string) {
    return fromRepositoryPromise(async () => {
      const comments = await this.prismaService.feedItemComment.findMany({
        where: {
          feedItemId: id,
        },
        include: {
          user: {
            select: {
              id: true,
              profileImagePath: true,
              name: true,
            },
          },
        },
      })

      const transformComments = comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        isPrivate: comment.isPrivate,
        author: {
          id: comment.user.id,
          profileImage: comment.user.profileImagePath,
          name: comment.user.name,
        },
      }))

      return transformComments
    })
  }
}

export const AdminFeedRepositoryPlugin = new Elysia({ name: 'AdminFeedRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService }) => ({
    feedRepository: new AdminFeedRepository(prismaService),
  }))
