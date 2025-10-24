import { FileService, PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { PostStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import { GetPostByIdResponse, GetPostsQuery, UpdatePostBody } from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminPostRepository {
  constructor(
    private prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async getPosts(query: GetPostsQuery = { limit: 10, page: 1 }) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    const where = {
      ...(query.search && {
        content: {
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
        this.prismaService.post.findMany({
          select: {
            feedItemId: true,
            content: true,
            status: true,
            feedItem: {
              select: {
                reactionCounts: true,
                numberOfComments: true,
                publishedAt: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
          take: limit,
          skip,
          orderBy: {
            feedItem: {
              createdAt: 'desc',
            },
          },
          where,
        }),
        this.prismaService.post.count({
          where,
        }),
      ])

      return {
        data: data.map(({ feedItemId, feedItem, ...postData }) => ({
          ...postData,
          id: feedItemId,
          createdAt: feedItem.createdAt,
          updatedAt: feedItem.updatedAt,
          publishedAt: feedItem.publishedAt,
          reactionCounts: feedItem.reactionCounts,
          commentsCount: feedItem.numberOfComments,
        })),
        meta: { count },
      }
    })
  }

  async getPostById(feedItemId: string) {
    return await fromRepositoryPromise(async () => {
      const {
        feedItemId: id,
        feedItem,
        attachments,
        hashTags,
        ...result
      } = await this.prismaService.post.findUniqueOrThrow({
        where: { feedItemId },
        select: {
          feedItemId: true,
          content: true,
          status: true,
          feedItem: {
            select: {
              author: {
                select: {
                  profileImagePath: true,
                  name: true,
                  responsibleArea: true,
                },
              },
              reactionCounts: true,
              numberOfComments: true,
              publishedAt: true,
              createdAt: true,
              updatedAt: true,
              comments: {
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  isPrivate: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      profileImagePath: true,
                    },
                  },
                },
              },
            },
          },
          attachments: {
            select: {
              id: true,
              attachmentPath: true,
            },
          },
          hashTags: {
            select: {
              hashTag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })

      return {
        id,
        createdAt: feedItem.createdAt,
        updatedAt: feedItem.updatedAt,
        publishedAt: feedItem.publishedAt,
        reactionCounts: feedItem.reactionCounts,
        commentsCount: feedItem.numberOfComments,
        author: {
          name: feedItem.author.name,
          profileImage: feedItem.author.profileImagePath
            ? this.fileService.getPublicFileUrl(feedItem.author.profileImagePath)
            : undefined,
          responsibleArea: feedItem.author.responsibleArea,
        },
        attachments: attachments.map(({ attachmentPath }) => ({
          attachmentPath,
        })),
        hashtags: hashTags.map(({ hashTag }) => ({
          id: hashTag.id,
          name: hashTag.name,
        })),
        comments: feedItem.comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          isPrivate: comment.isPrivate,
          author: {
            id: comment.user.id,
            name: comment.user.name,
            profileImage: comment.user.profileImagePath
              ? this.fileService.getPublicFileUrl(comment.user.profileImagePath)
              : undefined,
          },
        })),
        ...result,
      } satisfies GetPostByIdResponse
    })
  }

  async updatePostById(feedItemId: string, data: UpdatePostBody) {
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
    return await fromRepositoryPromise(
      this.prismaService.post.update({
        where: { feedItemId },
        data: { status: PostStatus.DELETED, deletedAt: new Date() },
      })
    )
  }
}

export const AdminPostRepositoryPlugin = new Elysia({ name: 'AdminPostRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    postRepository: new AdminPostRepository(prismaService, fileService),
  }))
