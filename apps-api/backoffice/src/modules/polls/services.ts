import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ListPollsResponse } from './models'
import { PollsRepository, PollsRepositoryPlugin } from './repository'

import { mapRawPrismaError } from '../../utils/prisma'

export class PollsService {
  constructor(private readonly pollsRepository: PollsRepository) {}

  async getPolls(userId?: string, query?: { page?: number; limit?: number }) {
    const polls = await this.pollsRepository.getPolls({
      userId,
      page: query?.page || 1,
      limit: query?.limit || 10,
    })

    if (polls.isErr()) {
      return mapRawPrismaError(polls.error)
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
          commentCount: item.numberOfComments,
          reactions: item.reactionCounts.map((reaction) => ({
            type: reaction.type,
            count: reaction.count,
          })),
          type: 'POLL',
          createdAt: item.createdAt,
          poll: {
            options:
              item.poll!.options.map((option) => ({
                id: option.id,
                title: option.title,
                votes: option.votes,
                isSelected: option.pollAnswers.length > 0,
              })) || [],
            title: item.poll!.title,
            totalVotes: item.poll!.options.reduce((acc, option) => acc + option.votes, 0),
          },
        }
      }),
    } satisfies ListPollsResponse)
  }

  async createPollVote(userId: string, pollId: string, optionId: string) {
    const result = await this.pollsRepository.createPollVote(userId, pollId, optionId)

    if (result.isErr()) {
      return mapRawPrismaError(result.error)
    }

    return ok()
  }

  async deletePollVote(userId: string, pollId: string, optionId: string) {
    const result = await this.pollsRepository.deletePollVote(userId, pollId, optionId)

    if (result.isErr()) {
      return mapRawPrismaError(result.error)
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
