import { createId } from '@paralleldrive/cuid2'
import {
  ElectionStatus,
  FileMimeType,
  FilePath,
  InternalErrorCode,
} from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err, mapRepositoryError } from '@pple-today/api-common/utils'
import {
  Election,
  ElectionCandidate,
  ElectionType,
  EligibleVoterType,
} from '@pple-today/database/prisma'
import dayjs from 'dayjs'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  ElectionCandidateWithVoteScore,
  ElectionWithCurrentStatus,
  GetElectionResponse,
  ListElectionResponse,
} from './models'
import { ElectionRepository, ElectionRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../plugins/file'

export class ElectionService {
  constructor(
    private readonly electionRepository: ElectionRepository,
    private readonly fileService: FileService
  ) {}

  private readonly SECONDS_IN_A_DAY = 60 * 60 * 24

  private isOnsiteElectionActive(election: Election): boolean {
    const now = new Date()

    const isPublished = election.publishDate && now >= election.publishDate
    if (!isPublished) {
      return false
    }

    const { startResult, endResult, closeVoting } = election
    const isResultAnnounced = startResult && endResult

    if (isResultAnnounced) {
      const isPastAnnouncePeriod = now > endResult
      if (isPastAnnouncePeriod) {
        return false
      }
    } else {
      const daysSinceClose =
        (now.getTime() - closeVoting.getTime()) / (this.SECONDS_IN_A_DAY * 1000)
      const hasExceededGracePeriod = daysSinceClose > 7

      if (hasExceededGracePeriod) {
        return false
      }
    }

    return true
  }

  private isOnlineElectionActive(election: Election): boolean {
    const now = new Date()

    const isPublished = Boolean(election.publishDate && now >= election.publishDate)
    const isPastAnnouncePeriod = Boolean(election.endResult && now > election.endResult)

    return isPublished && !isPastAnnouncePeriod
  }

  private isHybridElectionActive(election: Election): boolean {
    const now = new Date()

    const isPublished = Boolean(election.publishDate && now >= election.publishDate)
    const isPastAnnouncePeriod = Boolean(election.endResult && now > election.endResult)

    return isPublished && !isPastAnnouncePeriod
  }

  private isElectionActive(election: Election): boolean {
    if (election.isCancelled) {
      return false
    }

    switch (election.type) {
      case 'ONSITE':
        return this.isOnsiteElectionActive(election)
      case 'ONLINE':
        return this.isOnlineElectionActive(election)
      case 'HYBRID':
        return this.isHybridElectionActive(election)
    }
  }

  private getElectionStatus(election: Election): ElectionStatus {
    const now = new Date()

    if (now < election.openVoting) {
      return 'NOT_OPENED_VOTE'
    } else if (now < election.closeVoting) {
      return 'OPEN_VOTE'
    } else if (!election.startResult || now < election.startResult) {
      return 'CLOSED_VOTE'
    } else {
      return 'RESULT_ANNOUNCE'
    }
  }

  private isHybridElectionVoterRegistered(
    voterType: EligibleVoterType,
    electionType: ElectionType
  ): boolean | null {
    if (electionType !== 'HYBRID') {
      return null
    }
    return voterType === 'ONLINE'
  }

  private convertToListElection(
    election: Election & {
      voteRecords: { userId: string }[]
      _count: { voters: number; voteRecords: number }
    },
    voterType: EligibleVoterType
  ): ElectionWithCurrentStatus {
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
      status: this.getElectionStatus(election),
      votePercentage: 100 * (election._count.voteRecords / election._count.voters),
      isRegistered: this.isHybridElectionVoterRegistered(voterType, election.type),
      isVoted: election.voteRecords.length > 0,
    }
  }

  private convertToElectionCandidateWithVoteScore(
    candidate: ElectionCandidate,
    isShowResult?: boolean // TODO: use for mock
  ): ElectionCandidateWithVoteScore {
    return {
      id: candidate.id,
      electionId: candidate.electionId,
      name: candidate.name,
      description: candidate.description,
      profileImagePath: candidate.profileImagePath
        ? this.fileService.getPublicFileUrl(candidate.profileImagePath)
        : null,
      voteScorePercent: isShowResult ? Math.floor(Math.random() * 100) : undefined, // TODO: this is mock data
      number: candidate.number,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    }
  }

  async listMyEligibleElections(userId: string) {
    const eligibleVoters = await this.electionRepository.listMyEligibleVoters(userId)
    if (eligibleVoters.isErr()) {
      return mapRepositoryError(eligibleVoters.error)
    }

    const result = eligibleVoters.value
      .filter(({ election }) => this.isElectionActive(election))
      .map(({ election, type: voterType }) =>
        this.convertToListElection(election, voterType)
      ) satisfies ListElectionResponse

    return ok(result)
  }

  async getMyEligibleElection(userId: string, electionId: string) {
    const eligibleVoter = await this.electionRepository.getMyEligibleVoter(userId, electionId)
    if (eligibleVoter.isErr()) {
      return mapRepositoryError(eligibleVoter.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id "${electionId}"`,
        },
      })
    }

    if (!this.isElectionActive(eligibleVoter.value.election)) {
      return err({
        code: InternalErrorCode.ELECTION_NOT_FOUND,
        message: `Cannot found election id "${electionId}"`,
      })
    }

    const election = eligibleVoter.value.election
    const listElection = this.convertToListElection(election, eligibleVoter.value.type)
    const candidates = election.candidates.map((candidate) =>
      this.convertToElectionCandidateWithVoteScore(
        candidate,
        listElection.status == 'RESULT_ANNOUNCE'
      )
    )
    const result = {
      ...listElection,
      candidates,
    } satisfies GetElectionResponse

    return ok(result)
  }

  async registerElection(userId: string, electionId: string, type: EligibleVoterType) {
    const eligibleVoter = await this.electionRepository.getMyEligibleVoter(userId, electionId)
    if (eligibleVoter.isErr()) {
      return mapRepositoryError(eligibleVoter.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id: ${electionId}`,
        },
      })
    }

    const election = eligibleVoter.value.election

    const isHybirdElection = election.type === ElectionType.HYBRID
    if (!isHybirdElection) {
      return err({
        code: InternalErrorCode.ELECTION_REGISTER_TO_INVALID_TYPE,
        message: `Registration is allowed only for HYBRID elections.`,
      })
    }

    const now = new Date()
    const isInRegisterPeriod =
      election.openRegister &&
      election.closeRegister &&
      now >= election.openRegister &&
      now <= election.closeRegister
    if (!isInRegisterPeriod) {
      return err({
        code: InternalErrorCode.ELECTION_NOT_IN_REGISTER_PERIOD,
        message: `Cannot register at this time. The registration period is from ${dayjs(election.openRegister).format()} to ${dayjs(election.closeRegister).format()}.`,
      })
    }

    const updateVoterType = await this.electionRepository.updateEligibleVoterType(
      userId,
      electionId,
      type
    )
    if (updateVoterType.isErr()) {
      return mapRepositoryError(updateVoterType.error)
    }

    return ok()
  }

  private isElectionCanVoteOnline(election: Election): boolean {
    return election.type === 'HYBRID' || election.type === 'ONLINE'
  }

  private isElectionInVotePeriod(election: Election): boolean {
    const now = new Date()
    return now >= election.openVoting && now <= election.closeVoting
  }

  async withdrawBallot(userId: string, electionId: string) {
    const eligibleVoter = await this.electionRepository.getMyEligibleVoter(userId, electionId)
    if (eligibleVoter.isErr()) {
      return mapRepositoryError(eligibleVoter.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id: ${electionId}`,
        },
      })
    }

    const election = eligibleVoter.value.election

    if (!this.isElectionCanVoteOnline(election)) {
      return err({
        code: InternalErrorCode.ELECTION_WITHDRAW_TO_INVALID_TYPE,
        message: `Can only withdraw to election with type ONLINE and HYBRID`,
      })
    }

    if (!this.isElectionInVotePeriod(election)) {
      return err({
        code: InternalErrorCode.ELECTION_NOT_IN_VOTE_PERIOD,
        message: `Cannot withdraw at this time. The vote period is from ${dayjs(election.openVoting).format()} to ${dayjs(election.closeVoting).format()}.`,
      })
    }

    const deleteBallot = await this.electionRepository.deleteMyBallot(userId, electionId)
    if (deleteBallot.isErr()) {
      return mapRepositoryError(deleteBallot.error)
    }

    return ok()
  }

  async createBallot(input: {
    userId: string
    electionId: string
    encryptedBallot: string
    faceImagePath: FilePath
    location: string
  }) {
    const { userId, electionId, encryptedBallot, faceImagePath, location } = input
    const eligibleVoter = await this.electionRepository.getMyEligibleVoter(userId, electionId)
    if (eligibleVoter.isErr()) {
      return mapRepositoryError(eligibleVoter.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ELECTION_NOT_FOUND,
          message: `Cannot found election id: ${electionId}`,
        },
      })
    }

    const election = eligibleVoter.value.election

    if (!this.isElectionCanVoteOnline(election)) {
      return err({
        code: InternalErrorCode.ELECTION_VOTE_TO_INVALID_TYPE,
        message: `Can only vote to election with type ONLINE and HYBRID`,
      })
    }

    if (!this.isElectionInVotePeriod(election)) {
      return err({
        code: InternalErrorCode.ELECTION_NOT_IN_VOTE_PERIOD,
        message: `Cannot vote at this time. The vote period is from ${dayjs(election.openVoting).format()} to ${dayjs(election.closeVoting).format()}.`,
      })
    }

    const createBallotResult = await this.electionRepository.createMyBallot({
      userId,
      electionId,
      encryptedBallot,
      faceImagePath,
      location,
    })
    if (createBallotResult.isErr()) {
      return mapRepositoryError(createBallotResult.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.ELECTION_USER_ALREADY_VOTE,
          message: `User have already voted to election id: ${electionId}`,
        },
      })
    }

    return ok()
  }

  async createFaceImageUploadURL(contentType: FileMimeType) {
    const fileKeyResult = this.fileService.getFilePathFromMimeType(
      `temp/ballots/face-image-${createId()}`,
      contentType
    )

    if (fileKeyResult.isErr()) return err(fileKeyResult.error)

    const fileKey = fileKeyResult.value
    const uploadUrl = await this.fileService.createUploadSignedUrl(fileKey, {
      contentType,
    })

    if (uploadUrl.isErr()) return err(uploadUrl.error)

    return ok({
      fileKey,
      uploadFields: uploadUrl.value.fields,
      uploadUrl: uploadUrl.value.url,
    })
  }
}

export const ElectionServicePlugin = new Elysia()
  .use([ElectionRepositoryPlugin, FileServicePlugin])
  .decorate(({ electionRepository, fileService }) => ({
    electionService: new ElectionService(electionRepository, fileService),
  }))
