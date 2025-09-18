import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err } from '@pple-today/api-common/utils'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { UpdateTopicBody } from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

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
          bannerImagePath: true,
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
          bannerImagePath: null,
        },
      })
    )
  }

  async updateTopicById(topicId: string, data: UpdateTopicBody) {
    const existingTopic = await fromRepositoryPromise(
      this.prismaService.topic.findUniqueOrThrow({
        where: { id: topicId },
        select: { bannerImagePath: true },
      })
    )

    if (existingTopic.isErr()) return err(existingTopic.error)

    const updateFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const isSameBannerUrl = existingTopic.value.bannerImagePath === data.bannerImagePath
        if (!isSameBannerUrl && existingTopic.value.bannerImagePath) {
          const moveResult = await fileTx.removeFile(
            existingTopic.value.bannerImagePath as FilePath
          )
          if (moveResult.isErr()) return moveResult
        }

        let newBannerImage = data.bannerImagePath

        if (data.bannerImagePath) {
          const moveResult = await fileTx.bulkMoveToPublicFolder([data.bannerImagePath])
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
          bannerImagePath: newBannerImage,
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
        select: { bannerImagePath: true },
      })
    )

    if (existingTopic.isErr()) {
      return err(existingTopic.error)
    }

    const deleteFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        if (!existingTopic.value.bannerImagePath) return
        const txDeleteResult = await fileTx.removeFile(
          existingTopic.value.bannerImagePath as FilePath
        )
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
