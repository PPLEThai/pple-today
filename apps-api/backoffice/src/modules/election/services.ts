import { createId } from '@paralleldrive/cuid2'
import { FileMimeType, FilePath, InternalErrorCode } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { convertToElectionInfo, err, mapRepositoryError } from '@pple-today/api-common/utils'
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

  private isElectionInTimelinePeriod(election: Election, now: Date): boolean {
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

  private isShowElectionInOfficialPage(election: Election, now: Date): boolean {
    if (election.isCancelled) {
      return false
    }

    return this.isElectionInTimelinePeriod(election, now)
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
    voterType: EligibleVoterType,
    now: Date
  ): ElectionWithCurrentStatus {
    return {
      ...convertToElectionInfo(election, now),
      votePercentage: 100 * (election._count.voteRecords / election._count.voters),
      isRegistered: this.isHybridElectionVoterRegistered(voterType, election.type),
      isVoted: election.voteRecords.length > 0,
    }
  }

  private convertToElectionCandidateWithVoteScore(
    candidate: ElectionCandidate,
    resultMap: Map<string, number>,
    isShowResult?: boolean
  ): ElectionCandidateWithVoteScore {
    return {
      id: candidate.id,
      electionId: candidate.electionId,
      name: candidate.name,
      description: candidate.description,
      profileImagePath: candidate.profileImagePath
        ? this.fileService.getPublicFileUrl(candidate.profileImagePath)
        : null,
      voteScorePercent: isShowResult
        ? Math.floor((resultMap.get(candidate.id) ?? 0) * 100)
        : undefined,
      number: candidate.number,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    }
  }

  async listOfficialPageElections(userId: string) {
    const eligibleVoters = await this.electionRepository.listMyEligibleVoters(userId)
    if (eligibleVoters.isErr()) {
      return mapRepositoryError(eligibleVoters.error)
    }

    const now = new Date()
    const result = eligibleVoters.value
      .filter(({ election }) => this.isShowElectionInOfficialPage(election, now))
      .map(({ election, type: voterType }) =>
        this.convertToListElection(election, voterType, now)
      ) satisfies ListElectionResponse

    return ok(result)
  }

  async listProfilePageElections(userId: string) {
    const eligibleVoters = await this.electionRepository.listMyEligibleVoters(userId)
    if (eligibleVoters.isErr()) {
      return mapRepositoryError(eligibleVoters.error)
    }

    const now = new Date()
    const result = eligibleVoters.value
      .filter(({ election }) => this.isElectionInTimelinePeriod(election, now))
      .map(({ election, type: voterType }) =>
        this.convertToListElection(election, voterType, now)
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

    if (!this.isElectionInTimelinePeriod(eligibleVoter.value.election, new Date())) {
      return err({
        code: InternalErrorCode.ELECTION_NOT_FOUND,
        message: `Cannot found election id "${electionId}"`,
      })
    }

    const election = eligibleVoter.value.election
    const candidateIds = election.candidates.map((candidate) => candidate.id)

    const candidateResults = await this.electionRepository.getCandidateResults(candidateIds)
    if (candidateResults.isErr()) return mapRepositoryError(candidateResults.error)

    const listElection = this.convertToListElection(election, eligibleVoter.value.type, new Date())
    const candidates = election.candidates.map((candidate) =>
      this.convertToElectionCandidateWithVoteScore(
        candidate,
        candidateResults.value,
        listElection.status === 'RESULT_ANNOUNCE'
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
