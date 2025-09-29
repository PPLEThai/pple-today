import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { ElectionResultType, ElectionType, Prisma } from '@pple-today/database/prisma'
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

  private resultTypesMap = {
    [ElectionType.ONSITE]: [ElectionResultType.ONSITE],
    [ElectionType.ONLINE]: [ElectionResultType.ONLINE],
    [ElectionType.HYBRID]: [ElectionResultType.ONSITE, ElectionResultType.ONLINE],
  } as const

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
        if (deleteImageResult.isErr()) return err(deleteImageResult.error)
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

  async listElectionCandidates(electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.electionCandidate.findMany({
        where: { electionId },
      })
    )
  }

  async createElectionCandidate(electionId: string, data: AdminCreateElectionCandidateBody) {
    const moveFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (tx) => {
        const profileImage = data.profileImagePath
        if (!profileImage) return null

        const moveFileResult = await tx.bulkMoveToPublicFolder([profileImage])
        if (moveFileResult.isErr()) return err(moveFileResult.error)

        return moveFileResult.value[0]
      })
    )
    if (moveFileResult.isErr()) return err(moveFileResult.error)

    const [newProfileImagePath, fileTx] = moveFileResult.value

    const createCandidateResult = await fromRepositoryPromise(async () => {
      const election = await this.prismaService.election.findUniqueOrThrow({
        where: { id: electionId },
      })

      const results = this.resultTypesMap[election.type].map((type) => ({ type, count: 0 }))

      return this.prismaService.electionCandidate.create({
        data: {
          electionId,
          name: data.name,
          description: data.description,
          profileImagePath: newProfileImagePath,
          number: data.number,
          results: { createMany: { data: results } },
        },
      })
    })
    if (createCandidateResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
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

    const moveFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (tx) => {
        const newProfileImage = data.profileImagePath
        const oldProfileImage = candidateResult.value.profileImagePath

        if (newProfileImage === oldProfileImage) return

        if (oldProfileImage) {
          const deleteOldFileResult = await tx.removeFile(oldProfileImage as FilePath)
          if (deleteOldFileResult.isErr()) return err(deleteOldFileResult.error)
        }

        if (newProfileImage) {
          const moveNewFileResult = await tx.bulkMoveToPublicFolder([newProfileImage])
          if (moveNewFileResult.isErr()) return err(moveNewFileResult.error)
          return moveNewFileResult.value[0]
        }

        return null
      })
    )
    if (moveFileResult.isErr()) return err(moveFileResult.error)

    const [newProfileImage, fileTx] = moveFileResult.value

    const updateCandidateResult = await fromRepositoryPromise(
      this.prismaService.electionCandidate.update({
        where: { id: candidateId },
        data: {
          name: data.name,
          description: data.description,
          profileImagePath: newProfileImage,
          number: data.number,
        },
      })
    )

    if (updateCandidateResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(updateCandidateResult.error)
    }

    return ok(updateCandidateResult.value)
  }

  async deleteElectionCandidate(candidateId: string) {
    const candidateResult = await fromRepositoryPromise(
      this.prismaService.electionCandidate.findUniqueOrThrow({
        where: { id: candidateId },
      })
    )
    if (candidateResult.isErr()) return err(candidateResult.error)

    const deleteProfileImageResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (tx) => {
        const profileImage = candidateResult.value.profileImagePath
        if (!profileImage) return
        const deleteProfileImage = await tx.removeFile(profileImage as FilePath)
        if (deleteProfileImage.isErr()) return err(deleteProfileImage.error)
      })
    )
    if (deleteProfileImageResult.isErr()) return err(deleteProfileImageResult.error)

    const [_, fileTx] = deleteProfileImageResult.value

    const deleteResult = await fromRepositoryPromise(
      this.prismaService.electionCandidate.delete({
        where: { id: candidateId },
      })
    )
    if (deleteResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(deleteResult.error)
    }

    return ok()
  }

  async listElectionEligibleVoters(electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.electionEligibleVoter.findMany({
        where: {
          electionId,
        },
        include: {
          user: true,
        },
      })
    )
  }
}

export const AdminElectionRepositoryPlugin = new Elysia({ name: 'AdminElectionRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    adminElectionRepository: new AdminElectionRepository(prismaService, fileService),
  }))
