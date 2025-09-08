import { mapRepositoryError } from '@pple-today/api-common/utils'
import {
  Election,
  ElectionEligibleBallot,
  ElectionEligibleVoter,
  ElectionType,
  EligibleVoterType,
} from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ElectionStatus } from './models'
import { ElectionRepository, ElectionRepositoryPlugin } from './repostiory'

export class ElectionService {
  constructor(private readonly electionRepository: ElectionRepository) {}

  private readonly SECONDS_IN_A_DAY = 60 * 60 * 24

  private isShowElection(election: Election): boolean {
    switch (election.type) {
      case 'ONSITE':
        return this.isShowOnsiteElection(election)
      case 'ONLINE':
        return this.isShowOnlineElection(election)
      case 'HYBRID':
        return this.isShowHybridElection(election)
    }
  }

  private isShowOnsiteElection(election: Election): boolean {
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

  private isShowOnlineElection(election: Election): boolean {
    const now = new Date()

    const isPublished = election.publishDate && now < election.publishDate
    if (isPublished) {
      return false
    }

    const isPastAnnouncePeriod = election.endResult && now > election.endResult
    if (isPastAnnouncePeriod) {
      return false
    }

    return true
  }

  private isShowHybridElection(election: Election): boolean {
    const now = new Date()

    const isOpenRegister = election.openRegister && now < election.openRegister
    if (isOpenRegister) {
      return false
    }

    const isPastAnnouncePeriod = election.endResult && now > election.endResult
    if (isPastAnnouncePeriod) {
      return false
    }

    return true
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
    const totalvoted = voters.filter((voter) => !!voter.ballot).length
    return 100 * (totalvoted / totalVoters)
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
      .filter(({ election }) => this.isShowElection(election))
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
}

export const ElectionServicePlugin = new Elysia()
  .use(ElectionRepositoryPlugin)
  .decorate(({ electionRepository }) => ({
    electionService: new ElectionService(electionRepository),
  }))
