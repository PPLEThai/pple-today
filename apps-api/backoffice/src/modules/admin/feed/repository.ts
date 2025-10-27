import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminFeedRepository {
  constructor(private prismaService: PrismaService) {}

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
}

export const AdminFeedRepositoryPlugin = new Elysia({ name: 'AdminFeedRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService }) => ({
    feedRepository: new AdminFeedRepository(prismaService),
  }))
