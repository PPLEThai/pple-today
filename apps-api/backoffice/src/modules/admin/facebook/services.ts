import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  GetFacebookConnectAttemptResponse,
  GetFacebookConnectAttemptsQuery,
  GetFacebookConnectAttemptsResponse,
  GetFacebookConnectFailureSummaryResponse,
  GetFacebookPageByIdResponse,
  GetFacebookPagesQuery,
  GetFacebookPagesResponse,
  UpdateFacebookPageBody,
} from './models'
import { AdminFacebookPageRepository, AdminFacebookPageRepositoryPlugin } from './repository'

import { FacebookRepository, FacebookRepositoryPlugin } from '../../facebook/repository'

export class AdminFacebookPageService {
  constructor(
    private readonly adminFacebookPageRepository: AdminFacebookPageRepository,
    private readonly facebookRepository: FacebookRepository
  ) {}

  private async subscribeToPostUpdates(userId: string, pageId: string, pageAccessToken: string) {
    const subscribeResult = await this.facebookRepository.subscribeToPostUpdates(
      userId,
      pageId,
      pageAccessToken
    )

    if (subscribeResult.isErr())
      return mapRepositoryError(subscribeResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FACEBOOK_PAGE_NOT_FOUND,
        },
      })

    return ok()
  }

  private async unsubscribeToPostUpdates(pageId: string, pageAccessToken: string) {
    const unsubscribeResult = await this.facebookRepository.unsubscribeFromPostUpdates(
      pageId,
      pageAccessToken
    )

    if (unsubscribeResult.isErr())
      return mapRepositoryError(unsubscribeResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FACEBOOK_PAGE_NOT_FOUND,
        },
      })

    return ok()
  }

  async getFacebookPages(query: GetFacebookPagesQuery = { limit: 10, page: 1 }) {
    const result = await this.adminFacebookPageRepository.getFacebookPages(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value satisfies GetFacebookPagesResponse)
  }

  async getFacebookPageById(facebookPageId: string) {
    const result = await this.adminFacebookPageRepository.getFacebookPageById(facebookPageId)

    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FACEBOOK_PAGE_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetFacebookPageByIdResponse)
  }

  async updateFacebookPageById(facebookPageId: string, data: UpdateFacebookPageBody) {
    const pageResult = await this.getFacebookPageById(facebookPageId)
    if (pageResult.isErr()) return mapRepositoryError(pageResult.error)

    const updateResult = await this.adminFacebookPageRepository.updateFacebookPageById(
      facebookPageId,
      data
    )

    if (updateResult.isErr()) {
      return mapRepositoryError(updateResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FACEBOOK_PAGE_NOT_FOUND,
        },
      })
    }

    if (data.status) {
      const userId = updateResult.value.managerId
      if (userId === null)
        return err({
          code: InternalErrorCode.FACEBOOK_PAGE_AUTHOR_NOT_FOUND,
          message: 'Facebook Page author not found',
        })

      const pageId = updateResult.value.id
      const pageAccessToken = updateResult.value.pageAccessToken

      const subscriptionResult =
        data.status === 'APPROVED'
          ? await this.subscribeToPostUpdates(userId, pageId, pageAccessToken)
          : await this.unsubscribeToPostUpdates(pageId, pageAccessToken)
      if (subscriptionResult.isErr()) {
        const rollbackResult = await this.adminFacebookPageRepository.updateFacebookPageById(
          facebookPageId,
          { name: pageResult.value.name, status: pageResult.value.linkedStatus }
        )
        if (rollbackResult.isErr()) {
          return mapRepositoryError(rollbackResult.error, {
            RECORD_NOT_FOUND: {
              code: InternalErrorCode.FACEBOOK_PAGE_NOT_FOUND,
            },
          })
        }

        return mapRepositoryError(subscriptionResult.error)
      }
    }

    return ok({ message: `Facebook Page "${updateResult.value.id}" updated.` })
  }

  async getConnectAttempts(query: GetFacebookConnectAttemptsQuery) {
    const result = await this.adminFacebookPageRepository.getConnectAttempts(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value satisfies GetFacebookConnectAttemptsResponse)
  }

  async getConnectAttemptById(attemptId: string) {
    const result = await this.adminFacebookPageRepository.getConnectAttemptById(attemptId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.NOT_FOUND,
          message: 'Facebook connect attempt not found',
        },
      })

    const { context, steps, ...attempt } = result.value
    return ok({
      ...attempt,
      context: isPlainObject(context) ? context : {},
      steps: Array.isArray(steps) ? (steps as GetFacebookConnectAttemptResponse['steps']) : [],
    } satisfies GetFacebookConnectAttemptResponse)
  }

  /** Outcome totals and failures grouped by cause over the last `days` days. */
  async getConnectFailureSummary(days: number, now = new Date()) {
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const result = await this.adminFacebookPageRepository.getConnectFailureSummary(since)
    if (result.isErr()) return mapRepositoryError(result.error)

    const { outcomes, failures, failureUsers } = result.value
    const countOf = (outcome: string) =>
      outcomes.find((row) => row.outcome === outcome)?._count._all ?? 0
    const groupKey = (row: {
      failedStep: string | null
      platform: string
      errorDomain: string | null
      errorCode: string | null
    }) => JSON.stringify([row.failedStep, row.platform, row.errorDomain, row.errorCode])
    const usersPerGroup = new Map<string, number>()
    for (const row of failureUsers) {
      const key = groupKey(row)
      usersPerGroup.set(key, (usersPerGroup.get(key) ?? 0) + 1)
    }

    return ok({
      days,
      totals: {
        attempts: outcomes.reduce((sum, row) => sum + row._count._all, 0),
        succeeded: countOf('SUCCESS'),
        failed: countOf('FAILED'),
        cancelled: countOf('CANCELLED'),
        abandoned: countOf('ABANDONED'),
      },
      failures: failures.map((row) => ({
        failedStep: row.failedStep,
        platform: row.platform,
        errorDomain: row.errorDomain,
        errorCode: row.errorCode,
        attempts: row._count._all,
        users: usersPerGroup.get(groupKey(row)) ?? 0,
        lastSeenAt: row._max.createdAt ?? since,
        exampleMessage: row._max.errorMessage,
      })),
    } satisfies GetFacebookConnectFailureSummaryResponse)
  }
}

export const AdminFacebookPageServicePlugin = new Elysia({
  name: 'AdminFacebookPageService',
})
  .use([AdminFacebookPageRepositoryPlugin, FacebookRepositoryPlugin])
  .decorate(({ facebookPageRepository, facebookRepository }) => ({
    adminFacebookPageService: new AdminFacebookPageService(
      facebookPageRepository,
      facebookRepository
    ),
  }))

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
