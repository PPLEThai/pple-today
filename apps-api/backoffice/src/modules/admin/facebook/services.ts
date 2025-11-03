import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  GetFacebookPageByIdResponse,
  GetFacebookPagesQuery,
  GetFacebookPagesResponse,
  UpdateFacebookPageBody,
} from './models'
import { AdminFacebookPageRepository, AdminFacebookPageRepositoryPlugin } from './repository'

export class AdminFacebookPageService {
  constructor(private readonly adminFacebookPageRepository: AdminFacebookPageRepository) {}

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
    const updateResult = await this.adminFacebookPageRepository.updateFacebookPageById(
      facebookPageId,
      data
    )

    if (updateResult.isErr())
      return mapRepositoryError(updateResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FACEBOOK_PAGE_NOT_FOUND,
        },
      })

    return ok({ message: `Facebook Page "${updateResult.value.id}" updated.` })
  }
}

export const AdminFacebookPageServicePlugin = new Elysia({
  name: 'AdminFacebookPageService',
})
  .use([AdminFacebookPageRepositoryPlugin])
  .decorate(({ facebookPageRepository }) => ({
    adminFacebookPageService: new AdminFacebookPageService(facebookPageRepository),
  }))
