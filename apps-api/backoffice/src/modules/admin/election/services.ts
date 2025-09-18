import { ElectionInfo, InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { Election } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  AdminListElectionQuery,
  AdminListElectionResponse,
  AdminUpdateElectionBody,
} from './models'
import { AdminElectionRepository, AdminElectionRepositoryPlugin } from './repository'

export class AdminElectionService {
  constructor(private readonly adminElectionRepository: AdminElectionRepository) {}

  private convertToElectionInfo(election: Election): ElectionInfo {
    return {
      id: election.id,
      name: election.name,
      description: election.description,
      location: election.location,
      type: election.type,
      isCancelled: election.isCancelled,
      encryptionPublicKey: election.encryptionPublicKey,
      publishDate: election.publishDate,
      openRegister: election.openRegister,
      closeRegister: election.closeRegister,
      openVoting: election.openVoting,
      closeVoting: election.closeVoting,
      startResult: election.startResult,
      endResult: election.endResult,
      createdAt: election.createdAt,
      updatedAt: election.updatedAt,
    }
  }

  async listElections(input: AdminListElectionQuery) {
    const page = input.page || 1
    const limit = input.limit || 10

    const listElections = await this.adminElectionRepository.listElections({
      filter: {
        name: input.name,
        type: input.type,
        isCancelled: input.isCancelled,
      },
      pagination: {
        page,
        limit,
      },
    })
    if (listElections.isErr()) {
      return mapRepositoryError(listElections.error)
    }

    const data = listElections.value.data.map((election) => this.convertToElectionInfo(election))
    const currentPage = page
    const totalPage = Math.ceil(listElections.value.count / limit)
    const result = {
      meta: {
        currentPage,
        totalPage,
      },
      data,
    } satisfies AdminListElectionResponse

    return ok(result)
  }

  async getElection(electionId: string) {
    const getElectionResult = await this.adminElectionRepository.getElectionById(electionId)
    if (getElectionResult.isErr()) {
      return mapRepositoryError(getElectionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Not Found Election with id: ${electionId}`,
        },
      })
    }

    return ok(this.convertToElectionInfo(getElectionResult.value))
  }

  async updateElection(electionId: string, data: AdminUpdateElectionBody) {
    const updateElectionResult = await this.adminElectionRepository.updateElection(electionId, data)
    if (updateElectionResult.isErr()) {
      return mapRepositoryError(updateElectionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Not Found Election with id: ${electionId}`,
        },
      })
    }
    return ok()
  }

  async deleteElection(electionId: string) {
    const deleteResult = await this.adminElectionRepository.deleteElectionById(electionId)
    if (deleteResult.isErr()) {
      return mapRepositoryError(deleteResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot Found Election: ${electionId}`,
        },
      })
    }
    return ok()
  }

  async cancelElection(electionId: string) {
    const cancelResult = await this.adminElectionRepository.cancelElectionById(electionId)
    if (cancelResult.isErr()) {
      return mapRepositoryError(cancelResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot Found Election id: ${electionId}`,
        },
      })
    }
    return ok()
  }
}

export const AdminElectionServicePlugin = new Elysia({ name: 'AdminElectionService' })
  .use(AdminElectionRepositoryPlugin)
  .decorate(({ adminElectionRepository }) => ({
    adminElectionService: new AdminElectionService(adminElectionRepository),
  }))
