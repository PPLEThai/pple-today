import { ElectionInfo } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { Election } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { AdminListElectionQuery, AdminListElectionResponse } from './models'
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
}

export const AdminElectionServicePlugin = new Elysia({ name: 'AdminElectionService' })
  .use(AdminElectionRepositoryPlugin)
  .decorate(({ adminElectionRepository }) => ({
    adminElectionService: new AdminElectionService(adminElectionRepository),
  }))
