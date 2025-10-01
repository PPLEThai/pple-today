import { createId } from '@paralleldrive/cuid2'
import {
  ElectionCandidate as ElectionCandidateDTO,
  ElectionInfo,
  ImageFileMimeType,
  InternalErrorCode,
} from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err, mapRepositoryError } from '@pple-today/api-common/utils'
import { Election, ElectionCandidate, EligibleVoterType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  AdminCreateElectionCandidateBody,
  AdminListElectionQuery,
  AdminListElectionResponse,
  AdminUpdateElectionCandidateBody,
  ElectionEligibleVoterIdentifier,
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

  private isElectionPublished(election: Election): boolean {
    const now = new Date()
    const publishDate = (
      election.type === 'HYBRID' ? election.openRegister : election.publishDate
    ) as Date
    return now >= publishDate
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

  async listElectionEligibleVoters(electionId: string) {
    const voterResult = await this.adminElectionRepository.listElectionEligibleVoters(electionId)
    if (voterResult.isErr()) {
      return mapRepositoryError(voterResult.error)
    }

    return ok(
      voterResult.value.map((voter) => ({
        id: voter.user.id,
        name: voter.user.name,
        phoneNumber: voter.user.phoneNumber,
        profileImage:
          voter.user.profileImagePath &&
          this.fileService.getPublicFileUrl(voter.user.profileImagePath),
      }))
    )
  }

  async deleteElectionEligibleVoters(
    electionId: string,
    voters:
      | { identifier: 'USER_ID'; userIds: string[] }
      | { identifier: 'PHONE_NUMBER'; phoneNumbers: string[] }
  ) {
    const electionResult = await this.adminElectionRepository.getElectionById(electionId)
    if (electionResult.isErr()) {
      return mapRepositoryError(electionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id: ${electionId}`,
        },
      })
    }

    if (this.isElectionPublished(electionResult.value)) {
      return err({
        code: InternalErrorCode.ELECTION_ALREADY_PUBLISH,
        message: `Cannot Delete Voters of published election`,
      })
    }

    let result
    switch (voters.identifier) {
      case ElectionEligibleVoterIdentifier.USER_ID:
        result = await this.adminElectionRepository.bulkDeleteElectionEligibleVoterByUserIds(
          electionId,
          voters.userIds
        )
        break
      case ElectionEligibleVoterIdentifier.PHONE_NUMBER:
        result = await this.adminElectionRepository.bulkDeleteElectionEligibleVoterByPhoneNumber(
          electionId,
          voters.phoneNumbers
        )
        break
      default:
        return err({
          code: InternalErrorCode.ELECTION_INVALID_ELIGIBLE_VOTER_IDENTIFIER,
          message: 'Invalid voter identifier',
        })
    }

    if (result.isErr()) {
      return mapRepositoryError(result.error)
    }

    return ok()
  }

  async bulkCreateElectionEligibleVoters(
    electionId: string,
    voters:
      | { identifier: 'USER_ID'; userIds: string[] }
      | { identifier: 'PHONE_NUMBER'; phoneNumbers: string[] }
  ) {
    const electionResult = await this.adminElectionRepository.getElectionById(electionId)
    if (electionResult.isErr()) {
      return mapRepositoryError(electionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id: ${electionId}`,
        },
      })
    }

    if (this.isElectionPublished(electionResult.value)) {
      return err({
        code: InternalErrorCode.ELECTION_ALREADY_PUBLISH,
        message: `Cannot add voters to published election`,
      })
    }

    const voterType =
      electionResult.value.type === 'ONLINE' ? EligibleVoterType.ONLINE : EligibleVoterType.ONSITE

    const userIds: string[] = []

    switch (voters.identifier) {
      case 'USER_ID': {
        const nonExistUserIdsResult = await this.adminElectionRepository.filterExistUserIds(
          voters.userIds
        )
        if (nonExistUserIdsResult.isErr()) return mapRepositoryError(nonExistUserIdsResult.error)
        if (nonExistUserIdsResult.value.length !== 0) {
          return err({
            code: InternalErrorCode.USER_NOT_FOUND,
            message: `userIds: ${nonExistUserIdsResult.value} not exist`,
          })
        }
        userIds.push(...voters.userIds)
        break
      }
      case 'PHONE_NUMBER': {
        const result = await this.adminElectionRepository.listUserIdsFromPhoneNumbers(
          voters.phoneNumbers
        )
        if (result.isErr()) return mapRepositoryError(result.error)

        const { userIds: existUserIds, nonExistPhoneNumbers } = result.value

        if (nonExistPhoneNumbers.length !== 0) {
          return err({
            code: InternalErrorCode.USER_NOT_FOUND,
            message: `phoneNumbers: ${nonExistPhoneNumbers} not exist`,
          })
        }

        userIds.push(...existUserIds)
        break
      }
      default: {
        return err({
          code: InternalErrorCode.ELECTION_INVALID_ELIGIBLE_VOTER_IDENTIFIER,
          message: 'Invalid voter identifier',
        })
      }
    }

    const bulkCreateEligibleVotersResult =
      await this.adminElectionRepository.bulkCreateElectionEligibleVoterByUserIds(
        electionId,
        voterType,
        userIds
      )
    if (bulkCreateEligibleVotersResult.isErr())
      return mapRepositoryError(bulkCreateEligibleVotersResult.error)

    return ok()
  }
}

export const AdminElectionServicePlugin = new Elysia({ name: 'AdminElectionService' })
  .use([AdminElectionRepositoryPlugin, FileServicePlugin])
  .decorate(({ adminElectionRepository, fileService }) => ({
    adminElectionService: new AdminElectionService(adminElectionRepository, fileService),
  }))
