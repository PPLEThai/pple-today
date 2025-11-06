import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
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
