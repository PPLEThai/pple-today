import { PrismaService } from '@pple-today/api-common/services'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { UpdateTopicBody } from './models'

import { FilePath } from '../../../dtos/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'
import { err } from '../../../utils/error'
import { fromRepositoryPromise } from '../../../utils/error'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminTopicRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async getTopics(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = Math.max((page - 1) * limit, 0)

    return fromRepositoryPromise(
      this.prismaService.topic.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        take: limit,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
      })
    )
  }

  async getTopicById(topicId: string) {
    return await fromRepositoryPromise(async () => {
      const { hashTagInTopics, ...result } = await this.prismaService.topic.findUniqueOrThrow({
        where: { id: topicId },
        select: {
          id: true,
          name: true,
          description: true,
          bannerImage: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          hashTagInTopics: {
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
        ...result,
        hashtags: hashTagInTopics.map((hashTagInTopic) => hashTagInTopic.hashTag),
      }
    })
  }

  async createEmptyTopic() {
    return await fromRepositoryPromise(
      this.prismaService.topic.create({
        data: {
          name: '',
          description: null,
          bannerImage: null,
        },
      })
    )
  }

  async updateTopicById(topicId: string, data: UpdateTopicBody) {
    const existingTopic = await fromRepositoryPromise(
      this.prismaService.topic.findUniqueOrThrow({
        where: { id: topicId },
        select: { bannerImage: true },
      })
    )

    if (existingTopic.isErr()) return err(existingTopic.error)

    const updateFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const isSameBannerUrl = existingTopic.value.bannerImage === data.bannerImage
        if (!isSameBannerUrl && existingTopic.value.bannerImage) {
          const moveResult = await fileTx.removeFile(existingTopic.value.bannerImage as FilePath)
          if (moveResult.isErr()) return moveResult
        }

        let newBannerImage = data.bannerImage

        if (data.bannerImage) {
          const moveResult = await fileTx.bulkMoveToPublicFolder([data.bannerImage])
          if (moveResult.isErr()) return moveResult
          newBannerImage = moveResult.value[0]
        }

        return newBannerImage
      })
    )

    if (updateFileResult.isErr()) {
      return err(updateFileResult.error)
    }
    const [newBannerImage, fileTx] = updateFileResult.value

    const updateResult = await fromRepositoryPromise(
      this.prismaService.topic.update({
        where: { id: topicId },
        data: {
          name: data.name,
          description: data.description,
          bannerImage: newBannerImage,
          status: data.status,
          hashTagInTopics: {
            deleteMany: {},
            createMany: {
              data: data.hashtagIds.map((hashtagId) => ({
                hashTagId: hashtagId,
              })),
            },
          },
        },
      })
    )

    if (updateResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(updateResult.error)
    }

    return ok(updateResult.value)
  }

  async deleteTopicById(topicId: string) {
    const existingTopic = await fromRepositoryPromise(
      this.prismaService.topic.findUniqueOrThrow({
        where: { id: topicId },
        select: { bannerImage: true },
      })
    )

    if (existingTopic.isErr()) {
      return err(existingTopic.error)
    }

    const deleteFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        if (!existingTopic.value.bannerImage) return
        const txDeleteResult = await fileTx.removeFile(existingTopic.value.bannerImage as FilePath)
        if (txDeleteResult.isErr()) return txDeleteResult
      })
    )

    if (deleteFileResult.isErr()) return err(deleteFileResult.error)

    const [, fileTx] = deleteFileResult.value
    const deleteTopicResult = await fromRepositoryPromise(
      this.prismaService.topic.delete({
        where: { id: topicId },
      })
    )

    if (deleteTopicResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(deleteTopicResult.error)
    }

    return ok(deleteTopicResult.value)
  }
}

export const AdminTopicRepositoryPlugin = new Elysia({
  name: 'AdminTopicRepository',
})
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    adminTopicRepository: new AdminTopicRepository(prismaService, fileService),
  }))
