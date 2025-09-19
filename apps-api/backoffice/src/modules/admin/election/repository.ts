import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, FileTransactionService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { ElectionType, Prisma } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { AdminCreateElectionCandidateBody } from './models'

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
    return fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const deletedVoteRecords = await tx.electionVoteRecord.findMany({
          where: {
            electionId,
          },
        })

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
            data: {
              isCancelled: true,
            },
          }),
        ])

        const faceImagePaths = deletedVoteRecords
          .map((record) => record.faceImagePath)
          .filter((path) => path !== null)

        const deleteImageResult = await this.fileService.bulkDeleteFile(faceImagePaths)
        if (deleteImageResult.isErr()) throw deleteImageResult.error
      })
    )
  }

  async listElectionCandidates(electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.electionCandidate.findMany({
        where: { electionId },
      })
    )
  }

  async createElectionCandidate(electionId: string, data: AdminCreateElectionCandidateBody) {
    let profileImage = data.profileImage
    let fileTx: FileTransactionService | null = null

    if (profileImage) {
      const moveFileResult = await fromRepositoryPromise(
        this.fileService.$transaction(async (tx) => {
          const moveFileResult = await tx.bulkMoveToPublicFolder([profileImage!])
          if (moveFileResult.isErr()) throw moveFileResult.error

          return ok(moveFileResult.value[0])
        })
      )
      if (moveFileResult.isErr()) return err(moveFileResult.error)

      profileImage = moveFileResult.value[0].value
      fileTx = moveFileResult.value[1]
    }

    const createCandidateResult = await fromRepositoryPromise(
      this.prismaService.electionCandidate.create({
        data: {
          electionId,
          name: data.name,
          description: data.description,
          profileImage,
          number: data.number,
        },
      })
    )
    if (createCandidateResult.isErr()) {
      if (fileTx) {
        const rollbackResult = await fileTx.rollback()
        if (rollbackResult.isErr()) return err(rollbackResult.error)
      }
      return err(createCandidateResult.error)
    }

    return ok(createCandidateResult.value)
  }

  async updateElectionCandidate(candidateId: string, data: AdminCreateElectionCandidateBody) {
    const candidateResult = await fromRepositoryPromise(
      this.prismaService.electionCandidate.findUniqueOrThrow({
        where: { id: candidateId },
      })
    )
    if (candidateResult.isErr()) return err(candidateResult.error)

    const candidate = candidateResult.value
    let newProfileImage = data.profileImage
    const oldProfileImage = candidate.profileImage
    let fileTx: FileTransactionService | null = null

    if (newProfileImage != oldProfileImage) {
      const updateFileResult = await fromRepositoryPromise(
        this.fileService.$transaction(async (tx) => {
          if (oldProfileImage) {
            const deleteOldFileResult = await tx.removeFile(oldProfileImage as FilePath)
            if (deleteOldFileResult.isErr()) throw deleteOldFileResult.error
          }

          if (newProfileImage) {
            const moveNewFileResult = await tx.bulkMoveToPublicFolder([newProfileImage])
            if (moveNewFileResult.isErr()) throw moveNewFileResult.error

            return moveNewFileResult.value[0]
          }

          return null
        })
      )
      if (updateFileResult.isErr()) return err(updateFileResult.error)

      newProfileImage = updateFileResult.value[0]
      fileTx = updateFileResult.value[1]
    }

    const updateCandidateResult = await fromRepositoryPromise(
      this.prismaService.electionCandidate.update({
        where: { id: candidateId },
        data: {
          name: data.name,
          description: data.description,
          profileImage: newProfileImage,
          number: data.number,
        },
      })
    )

    if (updateCandidateResult.isErr()) {
      if (fileTx) {
        const rollbackResult = await fileTx.rollback()
        if (rollbackResult.isErr()) return err(rollbackResult.error)
      }
      console.log('gggg', updateCandidateResult)
      return err(updateCandidateResult.error)
    }

    return ok(updateCandidateResult.value)
  }

  async deleteElectionCandidate(candidateId: string) {
    return fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const candidate = await tx.electionCandidate.delete({
          where: { id: candidateId },
        })

        const oldProfileImage = candidate.profileImage
        if (oldProfileImage) {
          const deleteImageResult = await this.fileService.deleteFile(oldProfileImage as FilePath)
          if (deleteImageResult.isErr()) throw deleteImageResult.error
        }
      })
    )
  }
}

export const AdminElectionRepositoryPlugin = new Elysia({ name: 'AdminElectionRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    adminElectionRepository: new AdminElectionRepository(prismaService, fileService),
  }))
