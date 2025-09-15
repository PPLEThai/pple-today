import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class HashtagRepository {
  constructor(private readonly prismaService: PrismaService) {}
  async getHashtagById(hashtagId: string) {
    return fromRepositoryPromise(
      this.prismaService.hashTag.findFirstOrThrow({
        where: {
          id: hashtagId,
          status: 'PUBLISH',
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          hashTagInTopics: {
            select: {
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
    )
  }
}

export const HashtagRepositoryPlugin = new Elysia({ name: 'HashtagRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    hashtagRepository: new HashtagRepository(prismaService),
  }))
