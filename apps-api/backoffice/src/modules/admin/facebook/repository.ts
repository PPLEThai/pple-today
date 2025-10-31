import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { PostStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import {
  GetFacebookPageByIdResponse,
  GetFacebookPagesQuery,
  GetFacebookPagesResponse,
  UpdatePostBody,
} from './models'

import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminFacebookPageRepository {
  constructor(private prismaService: PrismaService) {}

  async getFacebookPages(query: GetFacebookPagesQuery = { limit: 10, page: 1 }) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    const where = {
      ...(query.search && {
        name: {
          contains: query.search,
          mode: 'insensitive' as const,
        },
      }),
      ...(query.status &&
        query.status.length > 0 && {
          status: {
            in: query.status,
          },
        }),
    }

    return fromRepositoryPromise(async () => {
      const [data, count] = await Promise.all([
        this.prismaService.facebookPage.findMany({
          select: {
            id: true,
            name: true,
            manager: {
              select: {
                numberOfFollowers: true,
              },
            },
            linkedStatus: true,
          },
          take: limit,
          skip,
          orderBy: {
            createdAt: 'desc',
          },
          where,
        }),
        this.prismaService.facebookPage.count({
          where,
        }),
      ])

      return {
        items: data.map(({ manager, ...facebookPageData }) => ({
          ...facebookPageData,
          numberOfFollowers: manager?.numberOfFollowers,
        })),
        meta: { count },
      } satisfies GetFacebookPagesResponse
    })
  }

  async getFacebookPageById(facebookPageId: string) {
    return await fromRepositoryPromise(async () => {
      const { manager, ...result } = await this.prismaService.facebookPage.findUniqueOrThrow({
        where: { id: facebookPageId },
        select: {
          id: true,
          name: true,
          manager: {
            select: {
              numberOfFollowers: true,
              id: true,
              name: true,
              profileImagePath: true,
            },
          },
          linkedStatus: true,
          createdAt: true,
        },
      })

      return {
        ...result,
        numberOfFollowers: manager?.numberOfFollowers,
        ...(manager && {
          user: {
            id: manager.id,
            name: manager.name,
            profileImagePath: manager.profileImagePath,
          },
        }),
      } satisfies GetFacebookPageByIdResponse
    })
  }

  async updatePostById(feedItemId: string, data: UpdatePostBody) {
    // const existingPost = await this.getDeletedPostById(feedItemId)
    // if (existingPost.isErr()) return err(existingPost.error)
    // if (existingPost.value)
    //   return err({
    //     code: InternalErrorCode.POST_ALREADY_DELETED,
    //     message: 'Cannot update deleted post.',
    //   })

    return await fromRepositoryPromise(
      this.prismaService.post.update({
        where: { feedItemId },
        data: {
          status: data.status,
          ...(data.status === PostStatus.PUBLISHED && {
            feedItem: {
              update: {
                publishedAt: new Date(),
              },
            },
          }),
        },
      })
    )
  }

  async deletePostById(feedItemId: string) {
    // const existingPost = await this.getDeletedPostById(feedItemId)
    // if (existingPost.isErr()) return err(existingPost.error)
    // if (existingPost.value)
    //   return err({
    //     code: InternalErrorCode.POST_ALREADY_DELETED,
    //     message: 'Post is already deleted.',
    //   })

    return await fromRepositoryPromise(
      this.prismaService.post.update({
        where: { feedItemId },
        data: { status: PostStatus.DELETED, deletedAt: new Date() },
      })
    )
  }
}

export const AdminFacebookPageRepositoryPlugin = new Elysia({ name: 'AdminFacebookPageRepository' })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    facebookPageRepository: new AdminFacebookPageRepository(prismaService),
  }))
