import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { err } from '@pple-today/api-common/utils'
import {
  Election,
  ElectionEligibleBallot,
  ElectionEligibleVoter,
  ElectionType,
  EligibleVoterType,
} from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ElectionStatus, GetElectionResponse } from './models'
import { ElectionRepository, ElectionRepositoryPlugin } from './repostiory'

export class ElectionService {
  constructor(private readonly electionRepository: ElectionRepository) {}

  private readonly SECONDS_IN_A_DAY = 60 * 60 * 24

  private isElectionActive(election: Election): boolean {
    switch (election.type) {
      case 'ONSITE':
        return this.isOnsiteElectionActive(election)
      case 'ONLINE':
        return this.isOnlineElectionActive(election)
      case 'HYBRID':
        return this.isHybridElectionActive(election)
    }
  }

  private isOnsiteElectionActive(election: Election): boolean {
    const now = new Date()

    const isPublished = election.publishDate && now > election.publishDate
    if (!isPublished) {
      return false
    }

    const { startResult, endResult, closeVoting } = election
    const isResultAnnounced = startResult && endResult

    if (isResultAnnounced && endResult) {
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

    const isOpenRegister = Boolean(election.openRegister && now >= election.openRegister)
    const isPastAnnouncePeriod = Boolean(election.endResult && now > election.endResult)

    return isOpenRegister && !isPastAnnouncePeriod
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

  private getVotePercentage(
    voters: (ElectionEligibleVoter & { ballot: ElectionEligibleBallot | null })[]
  ): number {
    const totalVoters = voters.length
    const totalVoted = voters.filter((voter) => !!voter.ballot).length

    return 100 * (totalVoted / totalVoters)
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

  async listMyEligibleElections(userId: string) {
    const eligibleVoters = await this.electionRepository.listMyEligibleVoters(userId)
    if (eligibleVoters.isErr()) {
      return mapRepositoryError(eligibleVoters.error)
    }

    const result = eligibleVoters.value
      .filter(({ election }) => this.isElectionActive(election))
      .map(({ election, type: voterType }) => {
        const { voters, ...rest } = election
        return {
          ...rest,
          status: this.getElectionStatus(election),
          votePercentage: this.getVotePercentage(voters),
          isRegistered: this.isHybridElectionVoterRegistered(voterType, election.type),
        }
      })

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

    const { voters, ...election } = eligibleVoter.value.election
    const result = {
      ...election,
      status: this.getElectionStatus(election),
      votePercentage: this.getVotePercentage(voters),
      isRegistered: this.isHybridElectionVoterRegistered(eligibleVoter.value.type, election.type),
    } satisfies GetElectionResponse

    return ok(result)
  }

  async RegisterEleciton(userId: string, electionId: string, type: EligibleVoterType) {
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

    const isHybirdElection = election.type == ElectionType.HYBRID
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
        message: `Cannot register at this time. The registration period is from ${election.openRegister?.toDateString()} ${election.openRegister?.toTimeString()} to ${election.closeRegister?.toDateString()} ${election.closeRegister?.toTimeString()}.`,
      })
    }

    const updateVoterType = await this.electionRepository.UpdateEligibleVoterType(
      eligibleVoter.value.id,
      type
    )
    if (updateVoterType.isErr()) {
      return mapRepositoryError(updateVoterType.error)
    }

    return ok()
  }
}

export const ElectionServicePlugin = new Elysia()
  .use(ElectionRepositoryPlugin)
  .decorate(({ electionRepository }) => ({
    electionService: new ElectionService(electionRepository),
  }))
