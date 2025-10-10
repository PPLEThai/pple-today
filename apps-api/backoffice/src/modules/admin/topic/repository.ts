import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err } from '@pple-today/api-common/utils'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { TopicStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { CreateTopicBody, UpdateTopicBody } from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminTopicRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async getTopics(
    query: { limit: number; page: number; search?: string } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = Math.max((page - 1) * limit, 0)

    return fromRepositoryPromise(async () => {
      const [data, count] = await Promise.all([
        this.prismaService.topic.findMany({
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                followedTopics: true,
              },
            },
          },
          take: limit,
          skip,
          orderBy: {
            createdAt: 'desc',
          },
          ...(query.search && {
            where: {
              name: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          }),
        }),
        this.prismaService.topic.count({
          ...(query.search && {
            where: {
              name: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          }),
        }),
      ])

      return {
        data: data.map(({ _count, ...topicData }) => ({
          ...topicData,
          followedTopicsCount: _count.followedTopics,
        })),
        meta: { count },
      }
    })
  }

  async getTopicById(topicId: string) {
    return await fromRepositoryPromise(async () => {
      const { hashTagInTopics, _count, ...result } =
        await this.prismaService.topic.findUniqueOrThrow({
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
            _count: {
              select: {
                followedTopics: true,
              },
            },
          },
        })

      return {
        ...result,
        hashtags: hashTagInTopics.map((hashTagInTopic) => hashTagInTopic.hashTag),
        followedTopicsCount: _count.followedTopics,
      }
    })
  }

  async createTopic(data: CreateTopicBody) {
    const createFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const moveResult = await fileTx.bulkMoveToPublicFolder([data.bannerImagePath])
        if (moveResult.isErr()) return moveResult
        return moveResult.value[0]
      })
    )

    if (createFileResult.isErr()) {
      return err(createFileResult.error)
    }
    const [bannerImagePath, fileTx] = createFileResult.value

    const createResult = await fromRepositoryPromise(
      this.prismaService.topic.create({
        data: {
          name: data.name,
          description: data.description,
          bannerImagePath,
          status: TopicStatus.PUBLISHED,
          hashTagInTopics: {
            createMany: {
              data: data.hashtagIds.map((hashtagId) => ({
                hashTagId: hashtagId,
              })),
            },
          },
        },
      })
    )

    if (createResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(createResult.error)
    }

    return ok(createResult.value)
  }

  async updateTopicById(topicId: string, data: UpdateTopicBody) {
    const existingTopic = await fromRepositoryPromise(
      this.prismaService.topic.findUniqueOrThrow({
        where: { id: topicId },
        select: { bannerImagePath: true, status: true },
      })
    )

    if (existingTopic.isErr()) return err(existingTopic.error)

    const updateFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        // ถ้าไม่มีรูปใหม่ ให้ใช้รูปเดิม
        if (!data.bannerImagePath) return existingTopic.value.bannerImagePath

        const isSameBannerUrl = existingTopic.value.bannerImagePath === data.bannerImagePath
        const isSameStatus = existingTopic.value.status === data.status

        // ถ้า same ให้เช็คว่า status เปลี่ยนเปล่า
        // เพราะถ้า status เปลี่ยน ต้องโยกรูปภาพไปให้ถูก folder
        if (isSameBannerUrl) {
          // ถ้าเป็นรูปเดิม สถานะเดิม ให้ใช้รูปเดิม
          if (isSameStatus) return existingTopic.value.bannerImagePath

          // รูปเดิม แต่คนละสถานะ ต้องย้ายรูปไปให้ถูกที่
          const moveResult =
            data.status === TopicStatus.PUBLISHED
              ? await fileTx.bulkMoveToPublicFolder([data.bannerImagePath])
              : await fileTx.bulkMoveToPrivateFolder([data.bannerImagePath])
          if (moveResult.isErr()) return moveResult
          return moveResult.value[0]
        }

        // ถ้าไม่ same แปลว่าเปลี่ยนรูป
        // 1. ลบรูปเดิมก่อน
        const deleteResult = await fileTx.deleteFile(
          existingTopic.value.bannerImagePath as FilePath
        )
        if (deleteResult.isErr()) return deleteResult

        // 2. โยกรูปใหม่ไป folder ตาม status
        const moveResult =
          data.status === TopicStatus.PUBLISHED
            ? await fileTx.bulkMoveToPublicFolder([data.bannerImagePath])
            : await fileTx.bulkMoveToPrivateFolder([data.bannerImagePath])
        if (moveResult.isErr()) return moveResult
        return moveResult.value[0]
      })
    )

    if (updateFileResult.isErr()) {
      return err(updateFileResult.error)
    }
    const [bannerImagePath, fileTx] = updateFileResult.value

    const updateResult = await fromRepositoryPromise(
      this.prismaService.topic.update({
        where: { id: topicId },
        data: {
          name: data.name,
          description: data.description,
          bannerImagePath,
          status: data.status,
          ...(data.hashtagIds && {
            hashTagInTopics: {
              deleteMany: {},
              createMany: {
                data: data.hashtagIds.map((hashtagId) => ({
                  hashTagId: hashtagId,
                })),
              },
            },
          }),
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
        const txDeleteResult = await fileTx.deleteFile(
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
