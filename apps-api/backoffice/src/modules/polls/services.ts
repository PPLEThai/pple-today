import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { FeedItemType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { ListPollsResponse } from './models'
import { PollsRepository, PollsRepositoryPlugin } from './repository'

export class PollsService {
  constructor(private readonly pollsRepository: PollsRepository) {}

  async getPolls(userId?: string, query?: { page?: number; limit?: number }) {
    const polls = await this.pollsRepository.getPolls({
      userId,
      page: query?.page || 1,
      limit: query?.limit || 10,
    })

    if (polls.isErr()) {
      return mapRepositoryError(polls.error)
    }

    return ok({
      data: polls.value.map((item) => {
        return {
          id: item.id,
          author: {
            id: item.author.id,
            name: item.author.name,
            profileImage: item.author.profileImage ?? undefined,
            province: item.author.district ?? '',
          },
          userReaction: item.reactions?.[0]?.type,
          commentCount: item.numberOfComments,
          reactions: item.reactionCounts.map((reaction) => ({
            type: reaction.type,
            count: reaction.count,
          })),
          type: FeedItemType.POLL,
          createdAt: item.createdAt,
          poll: {
            options:
              item.poll!.options.map((option) => ({
                id: option.id,
                title: option.title,
                votes: option.votes,
                isSelected: (option.pollAnswers ?? []).length > 0,
              })) || [],
            title: item.poll!.title,
            endAt: item.poll!.endAt,
            totalVotes: item.poll!.options.reduce((acc, option) => acc + option.votes, 0),
          },
        }
      }),
    } satisfies ListPollsResponse)
  }

  async createPollVote(userId: string, pollId: string, optionId: string) {
    const pollCondition = await this.pollsRepository.getPollCondition(userId, pollId)

    if (pollCondition.isErr()) {
      return mapRepositoryError(pollCondition.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
          message: 'Poll not found',
        },
      })
    }

    if (pollCondition.value.type === 'SINGLE_CHOICE' && pollCondition.value.numberOfVotes > 0) {
      return err({
        code: InternalErrorCode.POLL_ALREADY_VOTED,
        message: 'User has already voted for this poll',
      })
    }

    if (pollCondition.value.endAt < new Date()) {
      return err({
        code: InternalErrorCode.POLL_ALREADY_ENDED,
        message: 'Poll has already ended',
      })
    }

    const result = await this.pollsRepository.createPollVote(userId, pollId, optionId)

    if (result.isErr()) {
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
          message: 'Poll not found',
        },
        FOREIGN_KEY_CONSTRAINT_FAILED: {
          code: InternalErrorCode.POLL_OPTION_NOT_FOUND,
          message: 'Poll option not found',
        },
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.POLL_ALREADY_VOTED,
          message: 'User has already voted for this option',
        },
      })
    }

    return ok()
  }

  async deletePollVote(userId: string, pollId: string, optionId: string) {
    const pollCondition = await this.pollsRepository.getPollCondition(userId, pollId)

    if (pollCondition.isErr()) {
      return mapRepositoryError(pollCondition.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
          message: 'Poll not found',
        },
      })
    }

    if (pollCondition.value.endAt < new Date()) {
      return err({
        code: InternalErrorCode.POLL_ALREADY_ENDED,
        message: 'Poll has already ended',
      })
    }

    const result = await this.pollsRepository.deletePollVote(userId, pollId, optionId)

    if (result.isErr()) {
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
          message: 'Poll not found',
        },
      })
    }

    return ok()
  }
}

export const PollsServicePlugin = new Elysia({
  name: 'PollsService',
})
  .use(PollsRepositoryPlugin)
  .decorate(({ pollsRepository }) => ({
    pollsService: new PollsService(pollsRepository),
  }))
