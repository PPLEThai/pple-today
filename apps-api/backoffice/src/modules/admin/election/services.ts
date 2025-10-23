import { createId } from '@paralleldrive/cuid2'
import {
  ElectionCandidate as ElectionCandidateDTO,
  ElectionInfo,
  ImageFileMimeType,
  InternalErrorCode,
} from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err, mapRepositoryError } from '@pple-today/api-common/utils'
import {
  Election,
  ElectionCandidate,
  ElectionKeysStatus,
  ElectionMode,
  EligibleVoterType,
} from '@pple-today/database/prisma'
import crypto from 'crypto'
import Elysia from 'elysia'
import { ok } from 'neverthrow'
import * as R from 'remeda'
import { stringify } from 'safe-stable-stringify'

import {
  AdminCreateElectionBody,
  AdminCreateElectionCandidateBody,
  AdminListElectionQuery,
  AdminListElectionResponse,
  AdminUpdateElectionCandidateBody,
  ElectionEligibleVoterIdentifier,
} from './models'
import { AdminElectionRepository, AdminElectionRepositoryPlugin } from './repository'

import { BallotCryptoService, BallotCryptoServicePlugin } from '../../../plugins/ballot-crypto'
import { ConfigServicePlugin } from '../../../plugins/config'
import { FileServicePlugin } from '../../../plugins/file'

export class AdminElectionService {
  constructor(
    private readonly adminElectionRepository: AdminElectionRepository,
    private readonly fileService: FileService,
    private readonly ballotCryptoService: BallotCryptoService
  ) {}

  private checkIsElectionAllowedToModified(election: Election, now: Date) {
    const isPublished = !!election.publishDate && now >= election.publishDate
    if (isPublished) {
      return err({
        code: InternalErrorCode.ELECTION_ALREADY_PUBLISH,
        message: `Election is already published`,
      })
    }

    const isCancelled = election.isCancelled
    if (isCancelled) {
      return err({
        code: InternalErrorCode.ELECTION_IS_CANCELLED,
        message: `Election is cancelled`,
      })
    }

    return ok()
  }

  private convertToElectionInfo(election: Election): ElectionInfo {
    return {
      id: election.id,
      name: election.name,
      description: election.description,
      location: election.location,
      locationMapUrl: election.locationMapUrl,
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

  async createElection(input: AdminCreateElectionBody) {
    if (input.type === 'HYBRID' && (!input.openRegister || !input.closeRegister)) {
      return err({
        code: InternalErrorCode.BAD_REQUEST,
        message: 'Must specify openRegister and closeRegister for HYBRID election',
      })
    }

    if (
      (input.type === 'ONSITE' || input.type === 'HYBRID') &&
      (!input.location || !input.locationMapUrl)
    ) {
      return err({
        code: InternalErrorCode.BAD_REQUEST,
        message: 'Must specify location and locationMapUrl for ONSITE or HYBRID election',
      })
    }

    const electionId = createId()
    const keysResult = await this.ballotCryptoService.createElectionKeys(electionId)
    if (keysResult.isErr()) return err(keysResult.error)

    const electionResult = await this.adminElectionRepository.createElection({
      id: electionId,
      keysStatus: ElectionKeysStatus.PENDING_CREATED,
      ...input,
    })
    if (electionResult.isErr()) {
      const deleteResult = await this.ballotCryptoService.destroyElectionKeys(electionId)
      if (deleteResult.isErr()) return err(deleteResult.error)
      return mapRepositoryError(electionResult.error)
    }

    return ok(this.convertToElectionInfo(electionResult.value))
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

  async publishElection(electionId: string, publishDate: Date) {
    const electionResult = await this.adminElectionRepository.getElectionById(electionId)
    if (electionResult.isErr()) {
      return mapRepositoryError(electionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id: ${electionId}`,
        },
      })
    }

    const checkResult = this.checkIsElectionAllowedToModified(electionResult.value, new Date())
    if (checkResult.isErr()) return err(checkResult.error)

    const publishResult = await this.adminElectionRepository.publishElectionById(
      electionId,
      publishDate
    )
    if (publishResult.isErr()) {
      return mapRepositoryError(publishResult.error)
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
    const electionResult = await this.adminElectionRepository.getElectionById(electionId)
    if (electionResult.isErr()) {
      return mapRepositoryError(electionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Election id ${electionId} not found`,
        },
      })
    }

    const checkResult = this.checkIsElectionAllowedToModified(electionResult.value, new Date())
    if (checkResult.isErr()) return err(checkResult.error)

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
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.ELECTION_DUPLICATE_CANDIDATE,
          message: `Candidate name ${data.name} or number ${data.number} already exists in election ${electionId}`,
        },
      })
    }

    return ok(this.convertToCandidateDTO(createCandidateResult.value))
  }

  async updateElectionCandidate(candidateId: string, data: AdminUpdateElectionCandidateBody) {
    const electionResult = await this.adminElectionRepository.getElectionByCandidateId(candidateId)
    if (electionResult.isErr()) {
      return mapRepositoryError(electionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_CANDIDATE_NOT_FOUND,
          message: `Candidate id ${candidateId} not found`,
        },
      })
    }

    const checkResult = this.checkIsElectionAllowedToModified(electionResult.value, new Date())
    if (checkResult.isErr()) return err(checkResult.error)

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
    const electionResult = await this.adminElectionRepository.getElectionByCandidateId(candidateId)
    if (electionResult.isErr()) {
      return mapRepositoryError(electionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_CANDIDATE_NOT_FOUND,
          message: `Candidate id ${candidateId} not found`,
        },
      })
    }

    const checkResult = this.checkIsElectionAllowedToModified(electionResult.value, new Date())
    if (checkResult.isErr()) return err(checkResult.error)

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

    const checkResult = this.checkIsElectionAllowedToModified(electionResult.value, new Date())
    if (checkResult.isErr()) return err(checkResult.error)

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

    const checkResult = this.checkIsElectionAllowedToModified(electionResult.value, new Date())
    if (checkResult.isErr()) return err(checkResult.error)

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

  private checkIsElectionAllowedToUpdateResult(election: Election) {
    if (election.isCancelled) {
      return err({
        code: InternalErrorCode.ELECTION_IS_CANCELLED,
        message: `Election is cancelled`,
      })
    }

    const now = new Date()

    if (now < election.closeVoting) {
      return err({
        code: InternalErrorCode.ELECTION_NOT_IN_CLOSED_VOTE_PERIOD,
        message: `Cannot upload result before voting close`,
      })
    }

    if (election.startResult && now >= election.startResult) {
      return err({
        code: InternalErrorCode.ELECTION_NOT_IN_CLOSED_VOTE_PERIOD,
        message: `Cannot upload result after result announced`,
      })
    }

    return ok()
  }

  async uploadElectionOnsiteResult(
    electionId: string,
    result: { candidateId: string; votes: number }[]
  ) {
    const electionResult = await this.adminElectionRepository.getElectionById(electionId)
    if (electionResult.isErr()) {
      return mapRepositoryError(electionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id ${electionId}`,
        },
      })
    }

    const election = electionResult.value
    if (election.type !== 'ONSITE' && election.type !== 'HYBRID') {
      return err({
        code: InternalErrorCode.ELECTION_INVALID_TYPE,
        message: `Cannot upload onsite result for election type ${election.type}`,
      })
    }

    const checkResult = this.checkIsElectionAllowedToUpdateResult(election)
    if (checkResult.isErr()) return err(checkResult.error)

    const countResult = await this.adminElectionRepository.countElectionEligibleVoters(
      electionId,
      'ONSITE'
    )
    if (countResult.isErr()) return mapRepositoryError(countResult.error)

    const count = countResult.value
    const votes = R.sumBy(result, (candidate) => candidate.votes)
    // ONSITE election can have a case where votes exceed voters, but HYBRID election cannot
    if (election.type === 'HYBRID' && votes > count) {
      return err({
        code: InternalErrorCode.ELECTION_VOTES_EXCEED_VOTERS,
        message: `Total votes ${votes} exceed total onsite voters ${count}`,
      })
    }

    const uploadResult = await this.adminElectionRepository.uploadElectionOnsiteResult(
      election.id,
      result
    )
    if (uploadResult.isErr()) return mapRepositoryError(uploadResult.error)

    return ok()
  }

  private verifySignature(
    data: { candidateId: string; votes: number }[],
    signature: string,
    publicKey: string
  ): boolean {
    return crypto.verify(
      'sha256',
      Buffer.from(stringify(data)),
      {
        key: publicKey,
      },
      Buffer.from(signature, 'base64')
    )
  }

  async uploadElectionOnlineResult(
    electionId: string,
    status: 'COUNT_SUCCESS' | 'COUNT_FAILED',
    signature?: string,
    result?: { candidateId: string; votes: number }[]
  ) {
    const electionResult = await this.adminElectionRepository.getElectionById(electionId)
    if (electionResult.isErr()) {
      return mapRepositoryError(electionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id ${electionId}`,
        },
      })
    }

    const election = electionResult.value
    if (election.type !== 'ONLINE' && election.type !== 'HYBRID') {
      return err({
        code: InternalErrorCode.ELECTION_INVALID_TYPE,
        message: `Cannot upload online result for election type ${election.type}`,
      })
    }

    const checkResult = this.checkIsElectionAllowedToUpdateResult(election)
    if (checkResult.isErr()) return err(checkResult.error)

    if (status === 'COUNT_SUCCESS') {
      if (!result) {
        return err({
          code: InternalErrorCode.BAD_REQUEST,
          message: 'Result is required when status is COUNT_SUCCESS',
        })
      }

      if (!signature) {
        return err({
          code: InternalErrorCode.BAD_REQUEST,
          message: 'Signature is required when status is COUNT_SUCCESS',
        })
      }

      if (!this.verifySignature(result, signature, election.signingPublicKey || '')) {
        return err({
          code: InternalErrorCode.ELECTION_INVALID_SIGNATURE,
          message: 'Invalid signature',
        })
      }

      const countResult = await this.adminElectionRepository.countElectionEligibleVoters(
        electionId,
        'ONLINE'
      )
      if (countResult.isErr()) return mapRepositoryError(countResult.error)

      const count = countResult.value
      const votes = result.reduce((acc, cur) => acc + cur.votes, 0)
      if (votes > count) {
        return err({
          code: InternalErrorCode.ELECTION_VOTES_EXCEED_VOTERS,
          message: `Total votes ${votes} exceed total online voters ${count}`,
        })
      }

      const uploadResult = await this.adminElectionRepository.uploadSuccessElectionOnlineResult(
        electionId,
        result
      )
      if (uploadResult.isErr()) return mapRepositoryError(uploadResult.error)
    } else {
      const uploadResult =
        await this.adminElectionRepository.uploadFailedElectionOnlineResult(electionId)
      if (uploadResult.isErr()) return mapRepositoryError(uploadResult.error)
    }

    return ok()
  }

  async updateElectionKeys(
    electionId: string,
    keys: {
      status: ElectionKeysStatus
      encryptionPublicKey?: string
      signingPublicKey?: string
    }
  ) {
    if (
      keys.status === ElectionKeysStatus.CREATED &&
      (!keys.encryptionPublicKey || !keys.signingPublicKey)
    ) {
      return err({
        code: InternalErrorCode.BAD_REQUEST,
        message: 'Required publicKeys for status CREATED',
      })
    }

    const electionResult = await this.adminElectionRepository.getElectionById(electionId)
    if (electionResult.isErr()) {
      return mapRepositoryError(electionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id ${electionId}`,
        },
      })
    }

    if (electionResult.value.keysStatus !== ElectionKeysStatus.PENDING_CREATED) {
      return err({
        code: InternalErrorCode.ELECTION_KEY_NOT_IN_PENDING_CREATED_STATUS,
        message: `Key of election id ${electionId} not in PENDING_CREATED status`,
      })
    }

    const updateKeysResult = await this.adminElectionRepository.updateElectionKeys(
      electionId,
      keys.status === ElectionKeysStatus.CREATED ? keys : { status: keys.status }
    )
    if (updateKeysResult.isErr()) return mapRepositoryError(updateKeysResult.error)

    return ok()
  }

  async countBallots(electionId: string) {
    const electionResult = await this.adminElectionRepository.getElectionById(electionId)
    if (electionResult.isErr()) {
      return mapRepositoryError(electionResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id ${electionId}`,
        },
      })
    }

    const election = electionResult.value

    if (election.type !== 'ONLINE' && election.type !== 'HYBRID') {
      return err({
        code: InternalErrorCode.ELECTION_INVALID_TYPE,
        message: `Cannot upload online result for election type ${election.type}`,
      })
    }

    const checkResult = this.checkIsElectionAllowedToUpdateResult(election)
    if (checkResult.isErr()) return err(checkResult.error)

    if (election.keysStatus !== ElectionKeysStatus.CREATED) {
      return err({
        code: InternalErrorCode.ELECTION_KEY_NOT_READY,
        message: `Election's keys are not in the status that can be used to decrypt ballot`,
      })
    }

    const ballotsResult = await this.adminElectionRepository.listElectionBallots(electionId)
    if (ballotsResult.isErr()) return mapRepositoryError(ballotsResult.error)

    const ballots = ballotsResult.value.map((ballot) => ballot.encryptedBallot)

    const countResult = await this.ballotCryptoService.countBallots(electionId, ballots)
    if (countResult.isErr()) return mapRepositoryError(countResult.error)

    if (election.mode === ElectionMode.SECURE) {
      const unlinkResult = await this.adminElectionRepository.unlinkVoteRecordsToBallots(electionId)
      if (unlinkResult.isErr()) return mapRepositoryError(unlinkResult.error)
    }

    return ok()
  }
}

export const AdminElectionServicePlugin = new Elysia({ name: 'AdminElectionService' })
  .use([
    AdminElectionRepositoryPlugin,
    FileServicePlugin,
    BallotCryptoServicePlugin,
    ConfigServicePlugin,
  ])
  .decorate(({ adminElectionRepository, fileService, ballotCryptoService }) => ({
    adminElectionService: new AdminElectionService(
      adminElectionRepository,
      fileService,
      ballotCryptoService
    ),
  }))
