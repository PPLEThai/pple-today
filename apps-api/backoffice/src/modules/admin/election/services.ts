import { createId } from '@paralleldrive/cuid2'
import {
  ElectionCandidate as ElectionCandidateDTO,
  ElectionInfo,
  ImageFileMimeType,
  InternalErrorCode,
} from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err, mapRepositoryError } from '@pple-today/api-common/utils'
import { Election, ElectionCandidate } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  AdminCreateElectionCandidateBody,
  AdminListElectionQuery,
  AdminListElectionResponse,
  AdminUpdateElectionCandidateBody,
} from './models'
import { AdminElectionRepository, AdminElectionRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../../plugins/file'

export class AdminElectionService {
  constructor(
    private readonly adminElectionRepository: AdminElectionRepository,
    private readonly fileService: FileService
  ) {}

  private convertToElectionInfo(election: Election): ElectionInfo {
    return {
      id: election.id,
      name: election.name,
      description: election.description,
      location: election.location,
      type: election.type,
      mode: election.mode,
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

  private convertToCandidateDTO(candidate: ElectionCandidate): ElectionCandidateDTO {
    return {
      id: candidate.id,
      electionId: candidate.electionId,
      name: candidate.name,
      description: candidate.description,
      profileImagePath: candidate.profileImagePath,
      number: candidate.number,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
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

  async listElectionCandidates(electionId: string) {
    const candidatesResult = await this.adminElectionRepository.listElectionCandidates(electionId)
    if (candidatesResult.isErr()) return mapRepositoryError(candidatesResult.error)

    return ok(candidatesResult.value.map((c) => this.convertToCandidateDTO(c)))
  }

  async createCandidateProfileUploadURL(contentType: ImageFileMimeType) {
    const fileKeyResult = this.fileService.getFilePathFromMimeType(
      `temp/electionCandidates/${createId()}`,
      contentType
    )
    if (fileKeyResult.isErr()) return err(fileKeyResult.error)

    const uploadURLResult = await this.fileService.createUploadSignedUrl(fileKeyResult.value)
    if (uploadURLResult.isErr()) return err(uploadURLResult.error)

    return ok({
      fileKey: fileKeyResult.value,
      uploadUrl: uploadURLResult.value.url,
      uploadFields: uploadURLResult.value.fields,
    })
  }

  async createElectionCandidate(electionId: string, data: AdminCreateElectionCandidateBody) {
    const createCandidateResult = await this.adminElectionRepository.createElectionCandidate(
      electionId,
      data
    )
    if (createCandidateResult.isErr()) {
      return mapRepositoryError(createCandidateResult.error, {
        FOREIGN_KEY_CONSTRAINT_FAILED: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Not Found Election with id: ${electionId}`,
        },
      })
    }

    return ok(this.convertToCandidateDTO(createCandidateResult.value))
  }

  async updateElectionCandidate(candidateId: string, data: AdminUpdateElectionCandidateBody) {
    const updateCandidateResult = await this.adminElectionRepository.updateElectionCandidate(
      candidateId,
      data
    )
    if (updateCandidateResult.isErr()) {
      return mapRepositoryError(updateCandidateResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_CANDIDATE_NOT_FOUND,
          message: `Not Found Election Candidate with id: ${candidateId}`,
        },
      })
    }

    return ok(this.convertToCandidateDTO(updateCandidateResult.value))
  }

  async deleteElectionCandidate(candidateId: string) {
    const deleteResult = await this.adminElectionRepository.deleteElectionCandidate(candidateId)
    if (deleteResult.isErr()) {
      return mapRepositoryError(deleteResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_CANDIDATE_NOT_FOUND,
          message: `Cannot Found Election Candidate id: ${candidateId}`,
        },
      })
    }
    return ok()
  }
}

export const AdminElectionServicePlugin = new Elysia({ name: 'AdminElectionService' })
  .use([AdminElectionRepositoryPlugin, FileServicePlugin])
  .decorate(({ adminElectionRepository, fileService }) => ({
    adminElectionService: new AdminElectionService(adminElectionRepository, fileService),
  }))
