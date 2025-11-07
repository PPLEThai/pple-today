import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { EligibleVoterType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { FileServicePlugin } from '../../plugins/file'
import { PrismaServicePlugin } from '../../plugins/prisma'

export class ElectionRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async listMyEligibleVoters(userId: string) {
    return fromRepositoryPromise(
      this.prismaService.electionEligibleVoter.findMany({
        where: {
          userId,
        },
        include: {
          election: {
            include: {
              _count: { select: { voters: true, voteRecords: true } },
              voteRecords: { where: { userId }, select: { userId: true }, take: 1 },
            },
          },
        },
      })
    )
  }

  async getMyEligibleVoter(userId: string, electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.electionEligibleVoter.findUniqueOrThrow({
        where: {
          electionId_userId: {
            userId,
            electionId,
          },
        },
        include: {
          election: {
            include: {
              _count: { select: { voters: true, voteRecords: true } },
              voteRecords: { where: { userId }, select: { userId: true }, take: 1 },
              candidates: { include: { results: true } },
            },
          },
        },
      })
    )
  }

  async updateEligibleVoterType(userId: string, electionId: string, type: EligibleVoterType) {
    return fromRepositoryPromise(
      this.prismaService.electionEligibleVoter.update({
        where: {
          electionId_userId: {
            userId,
            electionId,
          },
        },
        data: {
          type,
        },
      })
    )
  }

  async deleteMyBallot(userId: string, electionId: string) {
    return fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const voteRecord = await tx.electionVoteRecord.findUniqueOrThrow({
          where: {
            electionId_userId: {
              electionId,
              userId,
            },
          },
        })

        await tx.electionVoteRecord.delete({
          where: {
            electionId_userId: {
              userId,
              electionId,
            },
          },
        })

        if (voteRecord.ballotId) {
          await tx.electionBallot.delete({
            where: {
              id: voteRecord.ballotId,
            },
          })
        }
      })
    )
  }

  async createMyBallot(input: {
    userId: string
    electionId: string
    encryptedBallot: string
    faceImagePath: FilePath
    location: string
  }) {
    const { userId, electionId, encryptedBallot, faceImagePath, location } = input

    const moveFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (tx) => {
        const moveFileResult = await tx.bulkMoveToPrivateFolder([faceImagePath])
        if (moveFileResult.isErr()) throw moveFileResult.error

        return moveFileResult.value[0]
      })
    )
    if (moveFileResult.isErr()) return err(moveFileResult.error)

    const [newFaceImagePath, fileTx] = moveFileResult.value

    const createBollotResult = await fromRepositoryPromise(
      this.prismaService.electionBallot.create({
        data: {
          electionId,
          encryptedBallot,
          voteRecord: {
            create: {
              electionId,
              userId,
              faceImagePath: newFaceImagePath,
              location,
            },
          },
        },
      })
    )

    if (createBollotResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(createBollotResult.error)
    }

    return ok(createBollotResult.value)
  }
}

export const ElectionRepositoryPlugin = new Elysia()
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    electionRepository: new ElectionRepository(prismaService, fileService),
  }))
