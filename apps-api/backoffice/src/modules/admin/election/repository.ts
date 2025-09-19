import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { ElectionType, Prisma } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminElectionRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async listElections(input: {
    filter?: {
      name?: string
      type?: ElectionType
      isCancelled?: boolean
    }
    pagination: {
      page: number
      limit: number
    }
  }) {
    const { page, limit } = input.pagination
    const skip = Math.max((page - 1) * limit, 0)

    const filter: Prisma.ElectionWhereInput = {
      name: {
        contains: input.filter?.name,
        mode: 'insensitive',
      },
      type: input.filter?.type,
      isCancelled: input.filter?.isCancelled,
    }

    return fromRepositoryPromise(async () => {
      const [data, count] = await Promise.all([
        this.prismaService.election.findMany({
          where: filter,
          orderBy: {
            updatedAt: 'desc',
          },
          take: limit,
          skip,
        }),
        this.prismaService.election.count({
          where: filter,
        }),
      ])

      return {
        data,
        count,
      }
    })
  }

  async getElectionById(electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.election.findUniqueOrThrow({
        where: { id: electionId },
      })
    )
  }

  async cancelElectionById(electionId: string) {
    const deletedVoteRecords = await this.prismaService.electionVoteRecord.findMany({
      where: {
        electionId,
      },
    })

    const faceImagePaths = deletedVoteRecords
      .map((record) => record.faceImagePath)
      .filter((path) => path !== null)

    const deleteImageResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (tx) => {
        const deleteImageResult = await tx.bulkRemoveFile(faceImagePaths as FilePath[])
        if (deleteImageResult.isErr()) throw deleteImageResult.error
      })
    )
    if (deleteImageResult.isErr()) return err(deleteImageResult.error)

    const [_, fileTx] = deleteImageResult.value

    const cancelResult = await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        await Promise.all([
          tx.electionBallot.deleteMany({
            where: {
              electionId,
            },
          }),
          tx.electionVoteRecord.deleteMany({
            where: {
              electionId,
            },
          }),
          tx.election.update({
            where: { id: electionId },
            data: { isCancelled: true },
          }),
        ])
      })
    )
    if (cancelResult.isErr()) {
      const rollbackImageResult = await fileTx.rollback()
      if (rollbackImageResult.isErr()) return err(rollbackImageResult.error)
      return err(cancelResult.error)
    }

    return ok()
  }
}

export const AdminElectionRepositoryPlugin = new Elysia({ name: 'AdminElectionRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    adminElectionRepository: new AdminElectionRepository(prismaService, fileService),
  }))
