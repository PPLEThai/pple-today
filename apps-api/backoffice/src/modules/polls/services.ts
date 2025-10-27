import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { FeedItemType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { ListPollsResponse } from './models'
import { PollsRepository, PollsRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../plugins/file'

export class PollsService {
  constructor(
    private readonly pollsRepository: PollsRepository,
    private readonly fileService: FileService
  ) {}

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
            profileImage: item.author.profileImagePath
              ? this.fileService.getPublicFileUrl(item.author.profileImagePath)
              : undefined,
            province: item.author.district ?? '',
          },
          publishedAt: item.publishedAt!,
          userReaction: item.reactions?.[0]?.type ?? null,
          commentCount: item.numberOfComments,
          reactions: item.reactionCounts.map((reaction) => ({
            type: reaction.type,
            count: reaction.count,
          })),
          type: FeedItemType.POLL,
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
            type: item.poll!.type,
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
        MODEL_NOT_CONNECT: {
          code: InternalErrorCode.POLL_VOTE_NOT_FOUND,
          message: 'Poll option not found',
        },
      })
    }

    return ok()
  }
}

export const PollsServicePlugin = new Elysia({
  name: 'PollsService',
})
  .use([PollsRepositoryPlugin, FileServicePlugin])
  .decorate(({ pollsRepository, fileService }) => ({
    pollsService: new PollsService(pollsRepository, fileService),
  }))
